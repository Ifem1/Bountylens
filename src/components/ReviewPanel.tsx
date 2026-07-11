"use client";

import { useState } from "react";
import type { EvidenceProof, Submission } from "@/lib/types";
import { claimPayout } from "@/lib/genlayer";
import { formatWeiToGen, safeJsonParse } from "@/lib/format";
import { CheckCircle, XCircle, AlertCircle, Copy, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

const VERDICT_STYLES = {
  PASS: { bg: "bg-[#22C55E]/10 border-[#22C55E]/30", text: "text-[#22C55E]" },
  REVISION: { bg: "bg-[#F59E0B]/10 border-[#F59E0B]/30", text: "text-[#F59E0B]" },
  REJECT: { bg: "bg-[#EF4444]/10 border-[#EF4444]/30", text: "text-[#EF4444]" },
};

const RISK_STYLES = {
  LOW: "text-[#22C55E]",
  MEDIUM: "text-[#F59E0B]",
  HIGH: "text-[#EF4444]",
};

const EVIDENCE_STYLES = {
  verified: "text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10",
  weak: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10",
  unverified: "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10",
  pending: "text-[#94A3B8] border-[#94A3B8]/30 bg-[#94A3B8]/10",
};

function formatConfidence(value: number): string {
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function formatPayout(value: string): string {
  if (!value || value === "0") return "";
  return `${formatWeiToGen(value)} GEN`;
}

export function ReviewPanel({ submission }: { submission: Submission }) {
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  if (!submission.verdict) {
    return (
      <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5">
        <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
          GenLayer evaluation in progress…
        </div>
      </div>
    );
  }

  const style = VERDICT_STYLES[submission.verdict] || VERDICT_STYLES.REJECT;
  const passedItems = safeJsonParse<string[]>(submission.passed_items, []);
  const missingItems = safeJsonParse<string[]>(submission.missing_items, []);
  const improvementNotes = safeJsonParse<string[]>(submission.improvement_notes, []);
  const evidenceProof = safeJsonParse<EvidenceProof | null>(submission.evidence_proof, null);
  const evidenceStatus = submission.evidence_status || "pending";
  const evidenceStyle = EVIDENCE_STYLES[evidenceStatus] || EVIDENCE_STYLES.pending;

  return (
    <div className={`rounded-xl border ${style.bg} p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {submission.verdict === "PASS" && <CheckCircle size={20} className="text-[#22C55E]" />}
          {submission.verdict === "REVISION" && <AlertCircle size={20} className="text-[#F59E0B]" />}
          {submission.verdict === "REJECT" && <XCircle size={20} className="text-[#EF4444]" />}
          <span className={`font-bold text-lg ${style.text}`}>{submission.verdict}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#94A3B8]">
            Score: <span className="text-[#F8FAFC] font-semibold">{submission.score ?? "—"}/100</span>
          </span>
          {submission.confidence != null && (
            <span className="text-[#94A3B8]">
              Confidence: <span className="text-[#F8FAFC] font-semibold">{formatConfidence(submission.confidence)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {submission.summary && (
        <p className="text-sm text-[#F8FAFC]">{submission.summary}</p>
      )}

      {/* Duplicate risk */}
      {submission.duplicate_risk && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span>
            Duplicate Risk:{" "}
            <span className={`font-semibold ${RISK_STYLES[submission.duplicate_risk]}`}>
              {submission.duplicate_risk}
            </span>
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${evidenceStyle}`}>
            {evidenceStatus === "verified" ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
            Evidence {evidenceStatus}
          </span>
        </div>
      )}

      {evidenceProof && (
        <div className="rounded-lg bg-[#111827] border border-[#1E293B] p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#F8FAFC]">Validator Web Evidence</p>
            {submission.evidence_hash && (
              <button
                onClick={() => navigator.clipboard.writeText(submission.evidence_hash || "")}
                className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] font-mono flex items-center gap-1"
              >
                <Copy size={10} /> {submission.evidence_hash.slice(0, 10)}
              </button>
            )}
          </div>
          {evidenceProof.checks?.length ? (
            <div className="space-y-2">
              {evidenceProof.checks.map((check, i) => (
                <div key={`${check.label}-${i}`} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="text-[#F8FAFC]">{check.label}</p>
                    {check.url && (
                      <a
                        href={check.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#38BDF8] hover:underline break-all"
                      >
                        {check.url}
                      </a>
                    )}
                    {check.error && <p className="text-[#EF4444]">{check.error}</p>}
                  </div>
                  <span className={check.reachable ? "text-[#22C55E]" : "text-[#EF4444]"}>
                    {check.status_code || "n/a"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#94A3B8]">No web checks were recorded.</p>
          )}
        </div>
      )}

      {/* Passed criteria */}
      {passedItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#22C55E] mb-2 uppercase tracking-wider">
            Passed Criteria
          </p>
          <ul className="space-y-1">
            {passedItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#94A3B8]">
                <CheckCircle size={12} className="text-[#22C55E] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing criteria */}
      {missingItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#EF4444] mb-2 uppercase tracking-wider">
            Missing Criteria
          </p>
          <ul className="space-y-1">
            {missingItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#94A3B8]">
                <XCircle size={12} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement notes */}
      {improvementNotes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#F59E0B] mb-2 uppercase tracking-wider">
            Improvement Notes
          </p>
          <ul className="space-y-1">
            {improvementNotes.map((note, i) => (
              <li key={i} className="text-xs text-[#94A3B8]">• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Reasoning */}
      {submission.reasoning && (
        <details className="text-xs">
          <summary className="text-[#94A3B8] cursor-pointer hover:text-[#F8FAFC] transition-colors">
            Full reasoning
          </summary>
          <p className="mt-2 text-[#94A3B8] leading-relaxed">{submission.reasoning}</p>
        </details>
      )}

      {/* Payout info */}
      {submission.verdict === "PASS" && (
        <div className="rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 p-3">
          <p className="text-xs text-[#22C55E] font-medium">
            {submission.payout_approved
              ? `Payout approved${submission.payout_amount ? ` - ${formatPayout(submission.payout_amount)}` : ""}`
              : "Payout approval processing…"}
          </p>
          {submission.payout_approved && !submission.payout_claimed && (
            <button
              type="button"
              disabled={claiming}
              onClick={async () => {
                setClaiming(true);
                setClaimError("");
                try {
                  await claimPayout(submission.id);
                } catch (error) {
                  setClaimError(error instanceof Error ? error.message : "Payout claim failed");
                } finally {
                  setClaiming(false);
                }
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#22C55E] px-3 py-1.5 text-xs font-semibold text-[#052E16] disabled:opacity-60"
            >
              {claiming && <Loader2 size={12} className="animate-spin" />}
              {claiming ? "Claiming..." : "Claim payout"}
            </button>
          )}
          {claimError && <p className="mt-2 text-xs text-[#FCA5A5]">{claimError}</p>}
        </div>
      )}

      {/* Submission URL */}
      <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
        <a
          href={submission.submission_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#38BDF8] hover:underline truncate max-w-xs"
        >
          {submission.submission_url}
        </a>
        <button
          onClick={() => navigator.clipboard.writeText(submission.id)}
          className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          <Copy size={11} /> {submission.id}
        </button>
      </div>
    </div>
  );
}
