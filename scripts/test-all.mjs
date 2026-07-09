// BountyLens end-to-end test suite against Studionet
// Run: node --env-file=.env.test scripts/test-all.mjs [suiteName ...]

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = process.env.RPC_URL;
const ADDRESS = process.env.CONTRACT_ADDRESS;

const REQUIRED = ["POSTER_PK", "USER1_PK", "USER2_PK", "USER3_PK", "RPC_URL", "CONTRACT_ADDRESS"];
for (const k of REQUIRED) {
  if (!process.env[k]) {
    console.error(`FATAL: env var ${k} missing. Aborting (no fallback).`);
    process.exit(2);
  }
}

const poster = createAccount(process.env.POSTER_PK);
const user1 = createAccount(process.env.USER1_PK);
const user2 = createAccount(process.env.USER2_PK);
const user3 = createAccount(process.env.USER3_PK);

const wallets = {
  poster: { account: poster, label: "poster" },
  user1: { account: user1, label: "user1" },
  user2: { account: user2, label: "user2" },
  user3: { account: user3, label: "user3" },
};

function mkClient(account) {
  return createClient({ chain: studionet, endpoint: RPC, account });
}
for (const w of Object.values(wallets)) w.client = mkClient(w.account);

const NONDET_TIMEOUT_MS = 5 * 60 * 1000;
const WRITE_TIMEOUT_MS = 90 * 1000;
/* eslint-disable @typescript-eslint/no-unused-vars */

const short = (s) => (s && s.length > 12 ? s.slice(0, 10) + "…" : s);

async function withRetry(label, fn, { attempts = 3, backoffMs = 5000 } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.log(`   ↻ ${label} attempt ${i} failed: ${e.message?.slice(0, 200)}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

function extractStderrTail(tx) {
  try {
    const stderr = tx?.consensus_data?.leader_receipt?.[0]?.genvm_result?.stderr
      ?? tx?.consensus_data?.leader_receipt?.[0]?.stderr
      ?? "";
    const lines = String(stderr).trim().split(/\r?\n/).filter(Boolean);
    return lines.slice(-2).join(" | ");
  } catch {
    return "";
  }
}

function extractExecResult(tx) {
  return tx?.consensus_data?.leader_receipt?.[0]?.execution_result
    ?? tx?.consensus_data?.leader_receipt?.[0]?.result
    ?? null;
}

async function doWrite(wallet, functionName, args, { value = 0n, timeout = WRITE_TIMEOUT_MS, expectRevert = false } = {}) {
  const argSummary = args.map((a) => {
    if (typeof a === "string") return `"${a.length > 30 ? a.slice(0, 27) + "…" : a}"`;
    if (typeof a === "bigint") return a.toString() + "n";
    return JSON.stringify(a);
  }).join(", ");
  console.log(`→ ${wallet.label} ${functionName}(${argSummary}) value=${value}`);
  const start = Date.now();

  const sendOnce = async () => {
    const hash = await wallet.client.writeContract({
      address: ADDRESS,
      functionName,
      args,
      value,
    });
    await wallet.client.waitForTransactionReceipt({ hash, retries: 200, interval: 3000 });
    const tx = await wallet.client.getTransaction({ hash });
    const execResult = extractExecResult(tx);
    const ok = execResult === "SUCCESS" || execResult === "ACCEPTED";
    return { hash, tx, execResult, ok };
  };

  const res = await withRetry(`${functionName}`, async () => {
    return await Promise.race([
      sendOnce(),
      new Promise((_, rj) => setTimeout(() => rj(new Error("write timeout")), timeout)),
    ]);
  });

  const ms = Date.now() - start;
  if (expectRevert) {
    if (res.ok) {
      throw new Error(`Expected revert but tx succeeded — ${functionName} tx=${res.hash}`);
    }
    const stderr = extractStderrTail(res.tx);
    console.log(`✓ ${functionName} reverted as expected (${ms}ms) tx=${res.hash} result=${res.execResult} stderr=${stderr.slice(0, 160)}`);
    return { ...res, ms, stderr };
  } else {
    if (!res.ok) {
      const stderr = extractStderrTail(res.tx);
      throw new Error(`${functionName} failed on-chain tx=${res.hash} result=${res.execResult} stderr=${stderr}`);
    }
    console.log(`✓ ${functionName} (${ms}ms) tx=${res.hash}`);
    return { ...res, ms };
  }
}

async function readContract(functionName, args = []) {
  return await wallets.poster.client.readContract({ address: ADDRESS, functionName, args });
}

function assert(cond, msg) {
  if (!cond) throw new Error("Assertion failed: " + msg);
}

function parseJsonField(s) {
  return typeof s === "string" ? JSON.parse(s) : s;
}

// ─────────────────────────────────────────────
// SUITES
// ─────────────────────────────────────────────

async function suite_step0() {
  console.log("\n━━━ Suite: step0 (sanity) ━━━");
  const t0 = Date.now();
  for (const [k, w] of Object.entries(wallets)) {
    const bal = await w.client.getBalance({ address: w.account.address });
    console.log(`  ${k} ${w.account.address} balance=${bal}`);
    if (bal === 0n) throw new Error(`${k} has zero balance`);
  }
  const count = await readContract("get_bounty_count", []);
  const subCount = await readContract("get_submission_count", []);
  console.log(`  contract reachable — bounty_count=${count} submission_count=${subCount}`);
  console.log(`SUMMARY step0 PASS (${Date.now() - t0}ms)`);
  return { ok: true };
}

async function createFreshBounty(opts = {}) {
  const prevCount = Number(await readContract("get_bounty_count", []));
  const args = [
    opts.title ?? "Write a haiku about ocean currents",
    opts.description ?? "Submit a three-line haiku describing how the Gulf Stream shapes Atlantic weather.",
    opts.category ?? "Writing",
    opts.reward_token ?? "GEN",
    opts.deadline_note ?? "Closes one week from posting",
    BigInt(opts.max_winners ?? 1),
    opts.acceptance_criteria ?? "Exactly three lines following 5-7-5 syllable structure mentioning ocean currents",
    opts.rejection_criteria ?? "Wrong syllable count, off-topic, or AI-generated boilerplate",
    opts.required_evidence ?? "Plain text of the haiku in the submission body",
    opts.evidence_schema ?? "Validators must fetch submitted URLs before judging.",
    BigInt(opts.pass_threshold ?? 70),
    opts.revision_allowed ?? false,
    opts.revision_notes ?? "",
    opts.is_private ?? false,
  ];
  await doWrite(wallets.poster, "create_bounty", args);
  const newCount = Number(await readContract("get_bounty_count", []));
  if (newCount !== prevCount + 1) throw new Error(`bounty_counter expected ${prevCount + 1}, got ${newCount}`);
  return `bounty_${newCount}`;
}

async function suite_happyCreateFundUpdate() {
  console.log("\n━━━ Suite: happy_create_fund_update ━━━");
  const t0 = Date.now();

  const bountyId = await createFreshBounty({
    max_winners: 2,
    revision_allowed: true,
    revision_notes: "One revision permitted if score within 15 of threshold",
  });
  console.log("  created", bountyId);

  let b = parseJsonField(await readContract("get_bounty", [bountyId]));
  assert(b.status === "open", "status open");
  assert(b.funded === false, "not funded");
  assert(b.poster.toLowerCase() === poster.address.toLowerCase(), "poster matches");
  assert(b.max_winners === 2, "max_winners=2");
  assert(b.pass_threshold === 70, "threshold=70");
  assert(b.revision_allowed === true, "revision_allowed");
  assert(b.criteria_locked === false, "criteria not yet locked");

  // Update before lock
  await doWrite(wallets.poster, "update_bounty", [
    bountyId,
    "Write a haiku about deep ocean currents",
    "Updated description: focus on the thermohaline circulation.",
    "Three lines, 5-7-5 syllables, mentions a named ocean current",
    "Wrong syllable count, off-topic, plagiarised, AI boilerplate",
    "Plain text haiku in submission body",
    "Validators must fetch submitted URLs before judging.",
    BigInt(75),
    true,
    "One revision permitted",
    "Closes in two weeks",
  ]);
  b = parseJsonField(await readContract("get_bounty", [bountyId]));
  assert(b.title.includes("deep ocean"), "title updated");
  assert(b.pass_threshold === 75, "threshold updated to 75");

  // Fund — 1 GEN total, split between 2 winners = 0.5 GEN each
  const fundAmount = 1_000_000_000_000_000_000n;
  await doWrite(wallets.poster, "fund_bounty", [bountyId], { value: fundAmount });
  b = parseJsonField(await readContract("get_bounty", [bountyId]));
  assert(b.funded === true, "funded true");
  assert(b.escrow_amount === fundAmount.toString(), `escrow=${fundAmount}`);
  assert(b.remaining_escrow === fundAmount.toString(), "remaining=escrow");
  assert(b.payout_per_winner === (fundAmount / 2n).toString(), "payout per winner");

  const poster_profile = parseJsonField(await readContract("get_poster_profile", [poster.address]));
  assert(Number(poster_profile.bounties_posted) >= 1, "poster.bounties_posted incremented");
  assert(Number(poster_profile.bounties_funded) >= 1, "poster.bounties_funded incremented");

  console.log(`SUMMARY happy_create_fund_update PASS (${Date.now() - t0}ms) bounty=${bountyId}`);
  return { ok: true, bountyId };
}

async function suite_happyCancelAndRefund() {
  console.log("\n━━━ Suite: happy_cancel_and_refund ━━━");
  const t0 = Date.now();

  const bountyId = await createFreshBounty({
    title: "Identify three rare mushroom species",
    description: "Provide notes distinguishing three rare temperate-forest mushrooms.",
    max_winners: 1,
  });
  const fundAmount = 500_000_000_000_000_000n; // 0.5 GEN
  await doWrite(wallets.poster, "fund_bounty", [bountyId], { value: fundAmount });

  // Cancel (no submissions yet so not criteria_locked)
  await doWrite(wallets.poster, "cancel_bounty", [bountyId]);
  let b = parseJsonField(await readContract("get_bounty", [bountyId]));
  assert(b.status === "cancelled", "cancelled");

  // Refund remaining escrow
  await doWrite(wallets.poster, "refund_remaining_escrow", [bountyId]);
  b = parseJsonField(await readContract("get_bounty", [bountyId]));
  assert(b.remaining_escrow === "0", "remaining=0");
  assert(b.refunded === true, "refunded true");

  console.log(`SUMMARY happy_cancel_and_refund PASS (${Date.now() - t0}ms) bounty=${bountyId}`);
  return { ok: true, bountyId };
}

async function suite_revertPaths() {
  console.log("\n━━━ Suite: revert_paths ━━━");
  const t0 = Date.now();

  // Use a fresh bounty for revert tests
  const bountyId = await createFreshBounty({
    title: "Translate a paragraph into Yoruba",
    description: "Translate the supplied English paragraph into idiomatic Yoruba.",
    max_winners: 1,
    revision_allowed: false,
  });

  // R1: empty title (input validation on create)
  await doWrite(wallets.poster, "create_bounty", [
    "", "desc", "Translation", "GEN", "soon", 1n,
    "criteria", "rej", "evidence", "schema", 70n, false, "", false,
  ], { expectRevert: true });

  // R2: pass_threshold out of range
  await doWrite(wallets.poster, "create_bounty", [
    "Valid title", "Valid description", "Translation", "GEN", "soon", 1n,
    "criteria", "rej", "evidence", "schema", 150n, false, "", false,
  ], { expectRevert: true });

  // R3: non-poster cannot fund
  await doWrite(wallets.user1, "fund_bounty", [bountyId], {
    value: 100_000_000_000_000_000n,
    expectRevert: true,
  });

  // R4: poster funds correctly to enable later revert tests
  await doWrite(wallets.poster, "fund_bounty", [bountyId], { value: 500_000_000_000_000_000n });

  // R5: double-fund must revert
  await doWrite(wallets.poster, "fund_bounty", [bountyId], {
    value: 100_000_000_000_000_000n,
    expectRevert: true,
  });

  // R6: poster cannot submit to own bounty
  await doWrite(wallets.poster, "submit_work", [
    bountyId, "https://example.com/own", "self-submission", "evidence", false, "",
  ], { expectRevert: true });

  // R7: non-existent bounty
  await doWrite(wallets.user1, "submit_work", [
    "bounty_does_not_exist_999999", "https://example.com/x", "x", "evidence", false, "",
  ], { expectRevert: true });

  // R8: refund before completed/cancelled should revert
  await doWrite(wallets.poster, "refund_remaining_escrow", [bountyId], { expectRevert: true });

  // R9: non-poster cannot cancel
  await doWrite(wallets.user1, "cancel_bounty", [bountyId], { expectRevert: true });

  // Read state — should still be "open" + funded + not refunded
  const b = parseJsonField(await readContract("get_bounty", [bountyId]));
  assert(b.status === "open", "status still open");
  assert(b.funded === true, "still funded");
  assert(b.refunded === false, "not refunded");

  console.log(`SUMMARY revert_paths PASS (${Date.now() - t0}ms) bounty=${bountyId}`);
  return { ok: true, bountyId };
}

function assertVerdictPayload(rev, threshold, revisionAllowed) {
  assert(rev && typeof rev === "object", "review is object");
  assert(["PASS", "REVISION", "REJECT"].includes(rev.verdict), `verdict in set: got ${rev.verdict}`);
  assert(["LOW", "MEDIUM", "HIGH"].includes(rev.duplicate_risk), `duplicate_risk in set: got ${rev.duplicate_risk}`);
  assert(["release_payment", "request_revision", "reject_submission"].includes(rev.payout_decision),
    `payout_decision in set: got ${rev.payout_decision}`);
  const score = Number(rev.score);
  assert(Number.isFinite(score) && score >= 0 && score <= 100, `score 0-100: got ${rev.score}`);
  assert(typeof rev.summary === "string" && rev.summary.length > 0, "summary non-empty");
  assert(typeof rev.reasoning === "string" && rev.reasoning.length > 0, "reasoning non-empty");
  assert(["verified", "weak", "unverified"].includes(rev.evidence_status), `evidence_status in set: got ${rev.evidence_status}`);
  assert(rev.web_evidence && typeof rev.web_evidence === "object", "web_evidence object present");
  // Deterministic guardrail relations
  if (rev.duplicate_risk === "HIGH") assert(rev.verdict === "REJECT", "HIGH dup => REJECT");
  if (rev.verdict === "PASS") {
    assert(score >= threshold, "PASS => score >= threshold");
    assert(rev.payout_decision === "release_payment", "PASS => release_payment");
  }
  if (rev.verdict === "REVISION") {
    assert(revisionAllowed, "REVISION => revision_allowed");
    assert(rev.payout_decision === "request_revision", "REVISION => request_revision");
  }
  if (rev.verdict === "REJECT") {
    assert(rev.payout_decision === "reject_submission", "REJECT => reject_submission");
  }
}

async function suite_nondetEvaluation() {
  console.log("\n━━━ Suite: nondet_evaluation ━━━");
  const t0 = Date.now();

  const bountyId = await createFreshBounty({
    title: "Ship a tested Next.js issue reproduction",
    description: "Build a small public repo that reproduces a UI bug, includes a README, and deploys a live demo for reviewers.",
    category: "Development",
    max_winners: 3,
    acceptance_criteria: "Public GitHub repository is reachable, README is present, commit SHA exists when provided, live demo URL responds, and submission explains how to run the test/build command.",
    rejection_criteria: "Missing repo, unreachable demo, copied submission evidence, or unverifiable claims.",
    required_evidence: "Structured JSON with repo_url, commit_sha, demo_url, test_command, and notes.",
    evidence_schema: "Validators fetch GitHub repo metadata, submitted commit when present, README metadata, and the live demo URL. PASS requires verified web evidence.",
    pass_threshold: 70,
    revision_allowed: true,
    revision_notes: "Up to one revision",
  });
  const fundAmount = 600_000_000_000_000_000n; // 0.6 GEN
  await doWrite(wallets.poster, "fund_bounty", [bountyId], { value: fundAmount });

  // Submission 1 — high-quality, expected to PASS
  const prevSubCount1 = Number(await readContract("get_submission_count", []));
  const evidence1 = JSON.stringify({
    repo_url: "https://github.com/vercel/next.js",
    commit_sha: "",
    demo_url: "https://nextjs.org",
    pr_url: "",
    docs_url: "https://nextjs.org/docs",
    test_command: "pnpm test",
    notes: "Public repo and public docs/demo URLs are deterministic web evidence fixtures.",
    additional_links: [],
  });
  await doWrite(wallets.user1, "submit_work", [
    bountyId,
    "https://github.com/vercel/next.js",
    "Submission provides a reachable public repo, docs/demo URL, and test command for validator-side evidence fetching.",
    evidence1,
    false,
    "",
  ], { timeout: NONDET_TIMEOUT_MS });
  const sid1 = `sub_${Number(await readContract("get_submission_count", []))}`;
  assert(sid1 === `sub_${prevSubCount1 + 1}`, "submission counter incremented by 1");

  const sub1 = parseJsonField(await readContract("get_submission", [sid1]));
  assert(sub1.bounty_id === bountyId, "submission bound to bounty");
  assert(sub1.contributor.toLowerCase() === user1.address.toLowerCase(), "contributor=user1");
  assert(["reviewed", "revision_requested"].includes(sub1.status), `submission status terminal: ${sub1.status}`);

  const rev1 = parseJsonField(await readContract("get_review", [sid1]));
  console.log("  review user1:", JSON.stringify({ verdict: rev1.verdict, score: rev1.score, dup: rev1.duplicate_risk, decision: rev1.payout_decision }));
  assertVerdictPayload(rev1, 70, true);

  // After the first submission the bounty should be criteria_locked
  const bAfter1 = parseJsonField(await readContract("get_bounty", [bountyId]));
  assert(bAfter1.criteria_locked === true, "criteria locked after first submission");
  assert(bAfter1.first_submission_id === sid1, `first_submission_id=${sid1}`);
  const locked = await readContract("is_criteria_locked", [bountyId]);
  assert(locked === true, "is_criteria_locked view");

  // Submission 2 — obvious duplicate of #1 (different wallet, same text)
  await doWrite(wallets.user2, "submit_work", [
    bountyId,
    "https://github.com/vercel/next.js",
    sub1.description,
    evidence1,
    false,
    "",
  ], { timeout: NONDET_TIMEOUT_MS });
  const sid2 = `sub_${Number(await readContract("get_submission_count", []))}`;
  const sub2 = parseJsonField(await readContract("get_submission", [sid2]));
  const rev2 = parseJsonField(await readContract("get_review", [sid2]));
  console.log("  review user2:", JSON.stringify({ verdict: rev2.verdict, score: rev2.score, dup: rev2.duplicate_risk, decision: rev2.payout_decision }));
  assertVerdictPayload(rev2, 70, true);

  // Submission 3 — clearly weak/off-topic from user3
  const evidence3 = JSON.stringify({
    repo_url: "",
    commit_sha: "",
    demo_url: "https://example.invalid/bountylens-missing-demo",
    pr_url: "",
    docs_url: "",
    test_command: "",
    notes: "This should fail evidence verification.",
    additional_links: [],
  });
  await doWrite(wallets.user3, "submit_work", [
    bountyId,
    "https://example.invalid/bountylens-missing-demo",
    "Claims to include a working demo but provides no reachable repo or proof.",
    evidence3,
    false,
    "",
  ], { timeout: NONDET_TIMEOUT_MS });
  const sid3 = `sub_${Number(await readContract("get_submission_count", []))}`;
  const sub3 = parseJsonField(await readContract("get_submission", [sid3]));
  const rev3 = parseJsonField(await readContract("get_review", [sid3]));
  console.log("  review user3:", JSON.stringify({ verdict: rev3.verdict, score: rev3.score, dup: rev3.duplicate_risk, decision: rev3.payout_decision }));
  assertVerdictPayload(rev3, 70, true);

  // Cross-check on-chain state matches view
  const subsList = JSON.parse(await readContract("get_bounty_submissions", [bountyId]));
  assert(Array.isArray(subsList) && subsList.length === 3, `bounty has 3 submissions, got ${subsList.length}`);
  assert(subsList[0] === sid1 && subsList[1] === sid2 && subsList[2] === sid3, "submission order");

  // Contributor profile sanity
  const prof1 = parseJsonField(await readContract("get_contributor_profile", [user1.address]));
  assert(Number(prof1.total_attempted) >= 1, "user1 total_attempted incremented");

  console.log(`SUMMARY nondet_evaluation PASS (${Date.now() - t0}ms) bounty=${bountyId} subs=${sid1},${sid2},${sid3}`);
  return { ok: true, bountyId, subs: [sid1, sid2, sid3] };
}

// ─────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────

const SUITES = {
  step0: suite_step0,
  happy_create_fund_update: suite_happyCreateFundUpdate,
  happy_cancel_and_refund: suite_happyCancelAndRefund,
  revert_paths: suite_revertPaths,
  nondet_evaluation: suite_nondetEvaluation,
};

const ORDER = [
  "step0",
  "happy_create_fund_update",
  "happy_cancel_and_refund",
  "revert_paths",
  "nondet_evaluation",
];

async function main() {
  const filter = process.argv.slice(2);
  const toRun = filter.length ? ORDER.filter((n) => filter.includes(n)) : ORDER;

  console.log("BountyLens E2E suite");
  console.log("  contract:", ADDRESS);
  console.log("  chain:", studionet.id, studionet.name);
  console.log("  rpc:", RPC);
  console.log("  poster:", poster.address);
  console.log("  user1:", user1.address);
  console.log("  user2:", user2.address);
  console.log("  user3:", user3.address);
  console.log("  suites:", toRun.join(", "));

  const wallStart = Date.now();
  const timings = {};
  for (const name of toRun) {
    const t = Date.now();
    try {
      await SUITES[name]();
      timings[name] = Date.now() - t;
    } catch (e) {
      timings[name] = Date.now() - t;
      console.error(`\n✗ SUITE ${name} FAILED after ${timings[name]}ms`);
      console.error("  reason:", e.message);
      if (e.stack) console.error(e.stack.split("\n").slice(0, 6).join("\n"));
      printSummary(timings, name);
      process.exit(1);
    }
  }
  printSummary(timings, null);
  console.log(`\nALL GREEN total=${Date.now() - wallStart}ms`);
  console.log(`contract=${ADDRESS} network=Studionet(${studionet.id})`);
}

function printSummary(timings, failedName) {
  console.log("\n━━━ FINAL SUMMARY ━━━");
  for (const [k, ms] of Object.entries(timings)) {
    const status = k === failedName ? "FAIL" : "PASS";
    console.log(`  ${status}  ${k.padEnd(28)} ${ms}ms`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
