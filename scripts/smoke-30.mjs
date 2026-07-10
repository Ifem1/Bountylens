// Deterministic 30-write smoke test for BountyLens on Studionet.
// Run: node --env-file=.env.test scripts/smoke-30.mjs
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = process.env.RPC_URL;
const ADDRESS = process.env.CONTRACT_ADDRESS;
const POSTER_PK = process.env.POSTER_PK;

if (!RPC || !ADDRESS || !POSTER_PK) {
  console.error("FATAL: RPC_URL, CONTRACT_ADDRESS, and POSTER_PK are required");
  process.exit(2);
}

const account = createAccount(POSTER_PK);
const client = createClient({ chain: studionet, endpoint: RPC, account });

const WRITE_TIMEOUT_MS = 120_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractExecResult(tx) {
  return tx?.consensus_data?.leader_receipt?.[0]?.execution_result
    ?? tx?.consensus_data?.leader_receipt?.[0]?.result
    ?? null;
}

function extractStderrTail(tx) {
  const stderr = tx?.consensus_data?.leader_receipt?.[0]?.genvm_result?.stderr
    ?? tx?.consensus_data?.leader_receipt?.[0]?.stderr
    ?? "";
  return String(stderr).trim().split(/\r?\n/).filter(Boolean).slice(-2).join(" | ");
}

async function readContract(functionName, args = []) {
  return await client.readContract({ address: ADDRESS, functionName, args });
}

async function writeContract(functionName, args, { value = 0n } = {}) {
  const started = Date.now();
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${functionName} timed out`)), WRITE_TIMEOUT_MS);
  });

  const send = async () => {
    const hash = await client.writeContract({ address: ADDRESS, functionName, args, value });
    await client.waitForTransactionReceipt({ hash, retries: 200, interval: 3000 });
    const tx = await client.getTransaction({ hash });
    const result = extractExecResult(tx);
    if (result !== "SUCCESS" && result !== "ACCEPTED") {
      throw new Error(`${functionName} failed tx=${hash} result=${result} stderr=${extractStderrTail(tx)}`);
    }
    return { hash, result, ms: Date.now() - started };
  };

  return await Promise.race([send(), timeout]);
}

function createArgs(i) {
  return [
    `Smoke bounty ${i}`,
    `Deterministic smoke test bounty ${i} for contract write coverage.`,
    "QA",
    "GEN",
    "Smoke test only",
    1n,
    "A valid smoke response must be specific, concise, and verifiable.",
    "Empty, unrelated, or copied responses are rejected.",
    "Plain text confirmation.",
    "No external evidence required for deterministic smoke writes.",
    70n,
    false,
    "",
    false,
  ];
}

function updateArgs(bountyId, i) {
  return [
    bountyId,
    `Smoke bounty ${i} updated`,
    `Updated deterministic smoke test bounty ${i}.`,
    "Updated smoke acceptance criteria.",
    "Reject unrelated or empty responses.",
    "Plain text confirmation.",
    "No external evidence required for deterministic smoke writes.",
    72n,
    false,
    "",
    "Smoke test only",
  ];
}

async function main() {
  console.log("BountyLens 30-write smoke");
  console.log("  contract:", ADDRESS);
  console.log("  chain:", studionet.id, studionet.name);
  console.log("  poster:", account.address);

  const balance = await client.getBalance({ address: account.address });
  if (balance === 0n) throw new Error("poster has zero balance");
  console.log("  poster balance:", balance.toString());

  const startCount = Number(await readContract("get_bounty_count", []));
  const hashes = [];
  let writes = 0;

  for (let i = 1; i <= 6; i++) {
    const create = await writeContract("create_bounty", createArgs(i));
    writes += 1;
    hashes.push(create.hash);
    const bountyId = `bounty_${startCount + i}`;
    console.log(`${String(writes).padStart(2, "0")}/30 create_bounty ${bountyId} ${create.hash}`);

    const update = await writeContract("update_bounty", updateArgs(bountyId, i));
    writes += 1;
    hashes.push(update.hash);
    console.log(`${String(writes).padStart(2, "0")}/30 update_bounty ${bountyId} ${update.hash}`);

    const fund = await writeContract("fund_bounty", [bountyId], { value: 100_000_000_000_000_000n });
    writes += 1;
    hashes.push(fund.hash);
    console.log(`${String(writes).padStart(2, "0")}/30 fund_bounty ${bountyId} ${fund.hash}`);

    const cancel = await writeContract("cancel_bounty", [bountyId]);
    writes += 1;
    hashes.push(cancel.hash);
    console.log(`${String(writes).padStart(2, "0")}/30 cancel_bounty ${bountyId} ${cancel.hash}`);

    const refund = await writeContract("refund_remaining_escrow", [bountyId]);
    writes += 1;
    hashes.push(refund.hash);
    console.log(`${String(writes).padStart(2, "0")}/30 refund_remaining_escrow ${bountyId} ${refund.hash}`);

    await sleep(1000);
  }

  const endCount = Number(await readContract("get_bounty_count", []));
  if (endCount !== startCount + 6) {
    throw new Error(`bounty_count expected ${startCount + 6}, got ${endCount}`);
  }
  if (writes !== 30 || hashes.length !== 30) {
    throw new Error(`expected 30 writes, got writes=${writes} hashes=${hashes.length}`);
  }

  console.log("SUMMARY smoke_30 PASS");
  console.log("writes:", writes);
  console.log("bounty_count:", `${startCount} -> ${endCount}`);
}

main().catch((error) => {
  console.error("SUMMARY smoke_30 FAIL");
  console.error(error.message);
  process.exit(1);
});
