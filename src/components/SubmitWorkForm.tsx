"use client";

import { useState } from "react";
import { submitWork } from "@/lib/genlayer";
import type { EvidencePayload } from "@/lib/types";
import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
  bountyId: string;
  isRevision?: boolean;
  originalSubmissionId?: string;
  criteriaLocked: boolean;
  onSuccess: (txHash: string) => void;
};

const emptyEvidence: EvidencePayload = {
  repo_url: "",
  commit_sha: "",
  demo_url: "",
  pr_url: "",
  docs_url: "",
  test_command: "",
  notes: "",
  additional_links: [],
};

export function SubmitWorkForm({
  bountyId,
  isRevision = false,
  originalSubmissionId = "",
  criteriaLocked,
  onSuccess,
}: Props) {
  const [evidence, setEvidence] = useState<EvidencePayload>(emptyEvidence);
  const [desc, setDesc] = useState("");
  const [extraLinks, setExtraLinks] = useState("");
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setEvidenceField<K extends keyof EvidencePayload>(
    key: K,
    value: EvidencePayload[K]
  ) {
    setEvidence((prev) => ({ ...prev, [key]: value }));
  }

  const hasVerifiableUrl =
    evidence.repo_url.trim() ||
    evidence.demo_url.trim() ||
    evidence.pr_url.trim() ||
    evidence.docs_url.trim();

  async function handleSubmit() {
    if (!desc.trim() || !hasVerifiableUrl) {
      setError("Add a description and at least one verifiable URL.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const payload: EvidencePayload = {
        repo_url: evidence.repo_url.trim(),
        commit_sha: evidence.commit_sha.trim(),
        demo_url: evidence.demo_url.trim(),
        pr_url: evidence.pr_url.trim(),
        docs_url: evidence.docs_url.trim(),
        test_command: evidence.test_command.trim(),
        notes: evidence.notes.trim(),
        additional_links: extraLinks
          .split(",")
          .map((link) => link.trim())
          .filter(Boolean),
      };

      const hash = await submitWork({
        bountyId,
        submissionUrl: payload.repo_url || payload.demo_url || payload.pr_url || payload.docs_url,
        description: desc.trim(),
        evidencePayload: JSON.stringify(payload),
        isRevision,
        originalSubmissionId,
      });
      setTxHash(hash);
      onSuccess(hash);
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
        <p className="text-xs text-[#94A3B8] mb-1">
          GenLayer validators are fetching your evidence and reviewing the result.
        </p>
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
            : "Validators fetch your repo, commit, demo, or PR before GenLayer judges the result."}
        </p>
      </div>

      {!criteriaLocked && (
        <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3 flex gap-2">
          <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#F59E0B] leading-relaxed">
            First submission locks the bounty criteria and evidence schema. After this,
            the poster cannot move the goalposts.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <Field label="GitHub repo URL">
          <input
            type="url"
            value={evidence.repo_url}
            onChange={(e) => setEvidenceField("repo_url", e.target.value)}
            placeholder="https://github.com/you/repo"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Commit SHA">
            <input
              value={evidence.commit_sha}
              onChange={(e) => setEvidenceField("commit_sha", e.target.value)}
              placeholder="Full commit hash for reviewed code"
              className={inputCls}
            />
          </Field>

          <Field label="Test command">
            <input
              value={evidence.test_command}
              onChange={(e) => setEvidenceField("test_command", e.target.value)}
              placeholder="npm test / npm run build"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Live demo URL">
            <input
              type="url"
              value={evidence.demo_url}
              onChange={(e) => setEvidenceField("demo_url", e.target.value)}
              placeholder="https://your-demo.example"
              className={inputCls}
            />
          </Field>

          <Field label="Pull request URL">
            <input
              type="url"
              value={evidence.pr_url}
              onChange={(e) => setEvidenceField("pr_url", e.target.value)}
              placeholder="https://github.com/org/repo/pull/123"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Docs or proof URL">
          <input
            type="url"
            value={evidence.docs_url}
            onChange={(e) => setEvidenceField("docs_url", e.target.value)}
            placeholder="https://docs.example.com/proof"
            className={inputCls}
          />
        </Field>

        <Field label="Description" required>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="Describe what you built and how the fetched evidence proves it meets the criteria."
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="Additional links">
          <input
            type="text"
            value={extraLinks}
            onChange={(e) => setExtraLinks(e.target.value)}
            placeholder="https://loom.com/share/..., https://docs.example.com/..."
            className={inputCls}
          />
          <p className="text-xs text-[#475569] mt-1">Comma-separated links to walkthroughs, docs, or screenshots.</p>
        </Field>

        <Field label="Evidence notes">
          <textarea
            value={evidence.notes}
            onChange={(e) => setEvidenceField("notes", e.target.value)}
            rows={2}
            placeholder="Point validators to the exact files, routes, or behavior they should inspect."
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      {error && (
        <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 p-3">
          <p className="text-xs text-[#EF4444]">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-[#111827] border border-[#1E293B] p-3">
        <p className="text-xs text-[#94A3B8]">
          PASS verdicts require validator-side web evidence and release payment automatically.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={pending || !desc.trim() || !hasVerifiableUrl}
        className="w-full py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {isRevision ? "Submit Revision" : "Submit Work"}
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-[#94A3B8] mb-1.5">
        {label}
        {required && <span className="text-[#EF4444] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-[#111827] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] transition-colors";
