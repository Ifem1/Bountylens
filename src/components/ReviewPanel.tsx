import type { Submission } from "@/lib/types";
import { safeJsonParse } from "@/lib/format";
import { CheckCircle, XCircle, AlertCircle, Copy } from "lucide-react";

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

export function ReviewPanel({ submission }: { submission: Submission }) {
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
              Confidence: <span className="text-[#F8FAFC] font-semibold">{Math.round(submission.confidence * 100)}%</span>
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
        <div className="text-xs">
          Duplicate Risk:{" "}
          <span className={`font-semibold ${RISK_STYLES[submission.duplicate_risk]}`}>
            {submission.duplicate_risk}
          </span>
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
              ? `✓ Payout approved${submission.payout_amount ? ` — ${submission.payout_amount} GEN` : ""}`
              : "Payout approval processing…"}
          </p>
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
