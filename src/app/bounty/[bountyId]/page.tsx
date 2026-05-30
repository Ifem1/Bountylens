"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getBounty,
  getBountySubmissions,
  getSubmission,
  cancelBounty,
  refundRemainingEscrow,
} from "@/lib/genlayer";
import { useWallet } from "@/components/WalletProvider";
import { FundBountyBox } from "@/components/FundBountyBox";
import { SubmitWorkForm } from "@/components/SubmitWorkForm";
import { ReviewPanel } from "@/components/ReviewPanel";
import type { Bounty, Submission } from "@/lib/types";
import { shortAddress, formatWeiToGen } from "@/lib/format";
import {
  Lock,
  Unlock,
  Loader2,
  Copy,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  open: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
  completed: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
  cancelled: "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30",
};

export default function BountyDetailPage() {
  const { bountyId } = useParams<{ bountyId: string }>();
  const { address } = useWallet();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionHash, setActionHash] = useState<string | null>(null);

  // GenLayer validators take 1–3 minutes. Poll every 8s for up to 4 minutes (30 × 8s = 240s).
  const POLL_INTERVAL = 8000;
  const MAX_POLLS = 30;

  const loadBountyData = useCallback(async (): Promise<boolean> => {
    const b = await getBounty(bountyId);
    if (!b) return false;
    setBounty(b);
    const ids = await getBountySubmissions(bountyId);
    const subs: Submission[] = [];
    for (const id of ids) {
      const s = await getSubmission(id);
      if (s) subs.push(s);
    }
    setSubmissions(subs);
    return true;
  }, [bountyId]);

  const load = useCallback(async () => {
    const found = await loadBountyData();
    setLoading(false);
    if (!found) setPolling(true);
  }, [loadBountyData]);

  useEffect(() => { load(); }, [load]);

  // Poll every 8s while waiting for the validator to confirm
  useEffect(() => {
    if (!polling) return;
    if (pollAttempt >= MAX_POLLS) { setPolling(false); return; }
    const timer = setTimeout(async () => {
      const found = await loadBountyData();
      if (found) {
        setPolling(false);
        setElapsedSecs(0);
      } else {
        setPollAttempt((n) => n + 1);
        setElapsedSecs((s) => s + POLL_INTERVAL / 1000);
      }
    }, POLL_INTERVAL);
    return () => clearTimeout(timer);
  }, [polling, pollAttempt, loadBountyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[#38BDF8]" />
      </div>
    );
  }

  if (polling) {
    const pct = Math.round((pollAttempt / MAX_POLLS) * 100);
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 max-w-sm mx-auto text-center px-4">
        <Loader2 size={32} className="animate-spin text-[#38BDF8]" />
        <div>
          <p className="text-[#F8FAFC] font-semibold mb-1">Waiting for validator confirmation</p>
          <p className="text-sm text-[#94A3B8]">
            GenLayer validators take 1–3 minutes to process transactions.
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-[#1E293B] rounded-full h-1.5">
          <div
            className="bg-[#38BDF8] h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-[#475569]">
          {elapsedSecs > 0 ? `${elapsedSecs}s elapsed · ` : ""}checking every 8s · up to 4 min
        </p>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-2xl mb-2">⏱️</p>
        <h2 className="text-lg font-semibold text-[#F8FAFC] mb-2">Still processing</h2>
        <p className="text-sm text-[#94A3B8] mb-2">
          The bounty wasn&apos;t found after 4 minutes. GenLayer validators may be under load.
        </p>
        <p className="text-xs text-[#475569] mb-6">
          Your transaction was submitted — click Retry to keep waiting, or check back later.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setPollAttempt(0); setElapsedSecs(0); setPolling(true); }}
            className="px-4 py-2 rounded-xl bg-[#0F172A] border border-[#1E293B] text-sm text-[#F8FAFC] hover:border-[#38BDF8] transition-colors"
          >
            Keep waiting
          </button>
          <Link href="/" className="px-4 py-2 rounded-xl bg-[#38BDF8] text-[#070A12] text-sm font-semibold hover:bg-[#0284C7] transition-colors">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  const isPoster = address?.toLowerCase() === bounty.poster.toLowerCase();
  const isOpen = bounty.status === "open";
  const mySubmission = submissions.find(
    (s) => s.contributor.toLowerCase() === address?.toLowerCase()
  );
  const canRevise =
    mySubmission?.verdict === "REVISION" && !mySubmission.is_revision;
  const canSubmit = isOpen && bounty.funded && !isPoster && !mySubmission;
  const canCancel = isPoster && isOpen && !bounty.criteria_locked;
  const remainingWei =
    bounty.remaining_escrow && bounty.remaining_escrow !== "0"
      ? BigInt(bounty.remaining_escrow)
      : 0n;
  const canRefund =
    isPoster && (bounty.status === "completed" || bounty.status === "cancelled") && remainingWei > 0n;

  async function doCancel() {
    if (!confirm("Cancel this bounty? This cannot be undone.")) return;
    setActionPending(true);
    setActionError(null);
    try {
      const hash = await cancelBounty(bountyId);
      setActionHash(hash);
      setTimeout(load, 2000);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setActionPending(false);
    }
  }

  async function doRefund() {
    setActionPending(true);
    setActionError(null);
    try {
      const hash = await refundRemainingEscrow(bountyId);
      setActionHash(hash);
      setTimeout(load, 2000);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setActionPending(false);
    }
  }

  const escrowDisplay = bounty.escrow_amount
    ? `${formatWeiToGen(bounty.escrow_amount)} GEN`
    : null;
  const remainingDisplay = remainingWei > 0n
    ? `${formatWeiToGen(bounty.remaining_escrow)} GEN`
    : null;
  const payoutDisplay = bounty.payout_per_winner
    ? `${formatWeiToGen(bounty.payout_per_winner)} GEN`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <Link href="/" className="text-xs text-[#94A3B8] hover:text-[#38BDF8] transition-colors">
        ← Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* ── Main ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <span className="px-2 py-0.5 rounded-full bg-[#111827] border border-[#1E293B]">
                  {bounty.category}
                </span>
                <span>·</span>
                <button
                  onClick={() => navigator.clipboard.writeText(bounty.poster)}
                  className="font-mono hover:text-[#38BDF8] transition-colors"
                >
                  {shortAddress(bounty.poster)}
                </button>
                {isPoster && (
                  <span className="px-2 py-0.5 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/30 text-[#A78BFA]">
                    You
                  </span>
                )}
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                  STATUS_BADGE[bounty.status] || STATUS_BADGE.cancelled
                }`}
              >
                {bounty.status}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-[#F8FAFC] mb-3">{bounty.title}</h1>
            <p className="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-wrap">
              {bounty.description}
            </p>

            {bounty.deadline_note && (
              <p className="mt-3 text-xs text-[#475569]">
                Deadline: {bounty.deadline_note}
              </p>
            )}
          </div>

          {/* Criteria */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-5">
            <div className="flex items-center gap-2">
              {bounty.criteria_locked ? (
                <>
                  <Lock size={14} className="text-[#A78BFA]" />
                  <span className="text-sm font-semibold text-[#A78BFA]">Criteria Locked</span>
                  {bounty.criteria_hash && (
                    <button
                      onClick={() => navigator.clipboard.writeText(bounty.criteria_hash!)}
                      className="ml-auto flex items-center gap-1 text-xs text-[#475569] hover:text-[#94A3B8] transition-colors"
                    >
                      <Copy size={10} />
                      hash
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Unlock size={14} className="text-[#F59E0B]" />
                  <span className="text-sm font-semibold text-[#F59E0B]">
                    Criteria unlock — locked on first submission
                  </span>
                </>
              )}
            </div>

            <CriteriaSection label="Acceptance Criteria" content={bounty.acceptance_criteria} color="success" />
            {bounty.rejection_criteria && (
              <CriteriaSection label="Rejection Criteria" content={bounty.rejection_criteria} color="danger" />
            )}
            <CriteriaSection label="Required Evidence" content={bounty.required_evidence} color="primary" />

            <div className="flex items-center gap-4 text-xs text-[#94A3B8] pt-2 border-t border-[#1E293B]">
              <span>Pass threshold: <strong className="text-[#F8FAFC]">{bounty.pass_threshold}%</strong></span>
              <span>Max winners: <strong className="text-[#F8FAFC]">{bounty.max_winners}</strong></span>
              {bounty.revision_allowed && (
                <span className="text-[#22C55E]">Revisions allowed</span>
              )}
            </div>
          </div>

          {/* Submit / Revision form */}
          {canSubmit && (
            <div>
              <div className="rounded-lg bg-[#F59E0B]/5 border border-[#F59E0B]/20 p-3 mb-4 flex gap-2">
                <AlertTriangle size={13} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#F59E0B]">
                  {!bounty.criteria_locked
                    ? "First submission locks the criteria. After this, the poster cannot edit acceptance criteria."
                    : "Criteria are locked. Your work will be evaluated against the hash-verified criteria above."}
                </p>
              </div>
              <SubmitWorkForm
                bountyId={bountyId}
                criteriaLocked={bounty.criteria_locked}
                onSuccess={load}
              />
            </div>
          )}

          {canRevise && mySubmission && (
            <SubmitWorkForm
              bountyId={bountyId}
              isRevision
              originalSubmissionId={mySubmission.id}
              criteriaLocked={bounty.criteria_locked}
              onSuccess={load}
            />
          )}

          {/* Submissions */}
          <div>
            <h2 className="text-base font-semibold text-[#F8FAFC] mb-4">
              Submissions ({submissions.length})
            </h2>
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-8 text-center">
                <p className="text-[#94A3B8] text-sm">No submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((s) => (
                  <div key={s.id} className="space-y-3">
                    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-[#94A3B8]">
                          {shortAddress(s.contributor)}
                          {s.contributor.toLowerCase() === address?.toLowerCase() && (
                            <span className="ml-2 text-[#38BDF8]">(you)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          {s.is_revision && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/30 text-[#A78BFA]">
                              Revision
                            </span>
                          )}
                          <span className="text-xs text-[#475569]">{s.id}</span>
                        </div>
                      </div>
                      {s.description && (
                        <p className="text-xs text-[#94A3B8] line-clamp-3 mb-2">{s.description}</p>
                      )}
                      <a
                        href={s.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#38BDF8] hover:underline"
                      >
                        <ExternalLink size={11} />
                        {s.submission_url}
                      </a>
                    </div>
                    <ReviewPanel submission={s} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Escrow panel */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5 space-y-4">
            <h3 className="font-semibold text-[#F8FAFC]">Escrow</h3>
            <div className="space-y-2 text-sm">
              <Row label="Status">
                {bounty.funded ? (
                  <span className="flex items-center gap-1 text-[#22C55E]">
                    <CheckCircle size={12} /> Funded
                  </span>
                ) : (
                  <span className="text-[#F59E0B]">Awaiting funding</span>
                )}
              </Row>
              {escrowDisplay && <Row label="Escrowed">{escrowDisplay}</Row>}
              {remainingDisplay && <Row label="Remaining">{remainingDisplay}</Row>}
              {payoutDisplay && <Row label="Per winner">{payoutDisplay}</Row>}
              <Row label="Winners">
                {bounty.winner_count} / {bounty.max_winners}
              </Row>
            </div>
          </div>

          {/* Poster actions */}
          {isPoster && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5 space-y-3">
              <h3 className="font-semibold text-[#F8FAFC]">Poster Actions</h3>

              {!bounty.funded && isOpen && (
                <FundBountyBox bountyId={bountyId} onSuccess={load} />
              )}

              {canCancel && (
                <button
                  onClick={doCancel}
                  disabled={actionPending}
                  className="w-full py-2.5 rounded-xl border border-[#EF4444]/30 text-[#EF4444] text-sm font-medium hover:bg-[#EF4444]/10 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {actionPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  Cancel Bounty
                </button>
              )}

              {canRefund && (
                <button
                  onClick={doRefund}
                  disabled={actionPending}
                  className="w-full py-2.5 rounded-xl border border-[#38BDF8]/30 text-[#38BDF8] text-sm font-medium hover:bg-[#38BDF8]/10 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {actionPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  Refund Remaining Escrow
                </button>
              )}

              {actionHash && (
                <div className="rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 p-3">
                  <p className="text-xs text-[#22C55E] font-mono break-all">{actionHash}</p>
                </div>
              )}

              {actionError && (
                <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 p-3">
                  <p className="text-xs text-[#EF4444]">{actionError}</p>
                </div>
              )}
            </div>
          )}

          {/* Payout notice for contributors */}
          {!isPoster && (
            <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
              <h3 className="font-semibold text-[#F8FAFC] mb-2 text-sm">Auto Payout</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Passing submissions are paid automatically by the BountyLens contract after
                GenLayer AI evaluation. No manual approval needed.
              </p>
            </div>
          )}

          {/* Contract info */}
          <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
            <h3 className="font-semibold text-[#F8FAFC] mb-3 text-sm">Contract Info</h3>
            <div className="space-y-2 text-xs">
              <Row label="Bounty ID">{bountyId}</Row>
              <Row label="Network">GenLayer Studionet</Row>
              {bounty.criteria_hash && (
                <Row label="Criteria hash">
                  <span className="font-mono truncate">{bounty.criteria_hash.slice(0, 12)}…</span>
                </Row>
              )}
              {bounty.criteria_lock_timestamp && (
                <Row label="Locked at">{bounty.criteria_lock_timestamp}</Row>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CriteriaSection({
  label,
  content,
  color,
}: {
  label: string;
  content: string;
  color: "success" | "danger" | "primary";
}) {
  const colorMap = {
    success: "text-[#22C55E]",
    danger: "text-[#EF4444]",
    primary: "text-[#38BDF8]",
  };
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${colorMap[color]}`}>
        {label}
      </p>
      <p className="text-sm text-[#94A3B8] leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[#94A3B8] flex-shrink-0">{label}</span>
      <span className="text-[#F8FAFC] text-right">{children}</span>
    </div>
  );
}
