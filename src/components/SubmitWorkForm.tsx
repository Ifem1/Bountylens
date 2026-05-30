"use client";

import { useState } from "react";
import { submitWork } from "@/lib/genlayer";
import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
  bountyId: string;
  isRevision?: boolean;
  originalSubmissionId?: string;
  criteriaLocked: boolean;
  onSuccess: () => void;
};

export function SubmitWorkForm({
  bountyId,
  isRevision = false,
  originalSubmissionId = "",
  criteriaLocked,
  onSuccess,
}: Props) {
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [evidence, setEvidence] = useState("");
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!url.trim() || !desc.trim()) return;
    setError(null);
    setPending(true);
    try {
      const hash = await submitWork({
        bountyId,
        submissionUrl: url.trim(),
        description: desc.trim(),
        evidenceLinks: evidence.trim(),
        isRevision,
        originalSubmissionId,
      });
      setTxHash(hash);
      setTimeout(onSuccess, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  }

  if (txHash) {
    return (
      <div className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5">
        <p className="text-sm font-semibold text-[#22C55E] mb-1">
          {isRevision ? "Revision submitted!" : "Submission sent!"}
        </p>
        <p className="text-xs text-[#94A3B8] mb-1">GenLayer is evaluating your work. Check back soon.</p>
        <p className="text-xs text-[#94A3B8] font-mono break-all">{txHash}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-[#F8FAFC] mb-0.5">
          {isRevision ? "Submit Revision" : "Submit Work"}
        </h3>
        <p className="text-xs text-[#94A3B8]">
          {isRevision
            ? "Improve your work based on the GenLayer feedback."
            : "Your submission will be evaluated by GenLayer AI against the bounty criteria."}
        </p>
      </div>

      {!criteriaLocked && (
        <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3 flex gap-2">
          <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#F59E0B] leading-relaxed">
            First submission locks the bounty criteria. After this, the poster cannot edit
            the acceptance criteria.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5">
            Submission URL <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/you/repo"
            className="w-full bg-[#111827] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5">
            Description <span className="text-[#EF4444]">*</span>
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="Describe what you built and how it meets the criteria…"
            className="w-full bg-[#111827] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-[#94A3B8] mb-1.5">Evidence links</label>
          <input
            type="text"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="https://demo.example.com, https://loom.com/share/..."
            className="w-full bg-[#111827] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
          <p className="text-xs text-[#475569] mt-1">Comma-separated links to demos, screenshots, or docs.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 p-3">
          <p className="text-xs text-[#EF4444]">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-[#111827] border border-[#1E293B] p-3">
        <p className="text-xs text-[#94A3B8]">
          Passing submissions are paid automatically by the contract after AI evaluation. No manual approval needed.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={pending || !url.trim() || !desc.trim()}
        className="w-full py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {isRevision ? "Submit Revision" : "Submit Work"}
      </button>
    </div>
  );
}
