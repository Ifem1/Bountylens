"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBounty, getBountyCount } from "@/lib/genlayer";
import { useWallet } from "./WalletProvider";
import { BOUNTY_CATEGORIES, type EvidenceMode } from "@/lib/types";
import { Loader2, Info } from "lucide-react";

type FormData = {
  title: string;
  description: string;
  category: string;
  deadlineNote: string;
  maxWinners: number;
  acceptanceCriteria: string;
  rejectionCriteria: string;
  requiredEvidence: string;
  evidenceMode: EvidenceMode;
  evidenceSchema: string;
  passThreshold: number;
  revisionAllowed: boolean;
  revisionNotes: string;
  isPrivate: boolean;
};

const EVIDENCE_SCHEMAS: Record<EvidenceMode, string> = {
  repo_demo:
    "Required structured fields: repo_url, commit_sha, demo_url, test_command, notes. Validators fetch the GitHub repo, commit, README, and demo URL before judging.",
  pull_request:
    "Required structured fields: repo_url, pr_url, commit_sha, test_command, notes. Validators fetch the GitHub repo, pull request, commit, and README before judging.",
  research_report:
    "Required structured fields: repo_url or docs_url, commit_sha when code is included, notes, additional_links. Validators fetch available URLs before judging.",
  custom:
    "Required structured fields must be listed by the bounty poster. Validators fetch submitted URLs and reject if required web evidence is not reachable.",
};

const DEFAULTS: FormData = {
  title: "",
  description: "",
  category: "Development",
  deadlineNote: "",
  maxWinners: 1,
  acceptanceCriteria: "",
  rejectionCriteria: "",
  requiredEvidence: "",
  evidenceMode: "repo_demo",
  evidenceSchema: EVIDENCE_SCHEMAS.repo_demo,
  passThreshold: 70,
  revisionAllowed: true,
  revisionNotes: "",
  isPrivate: false,
};

export function CreateBountyForm() {
  const router = useRouter();
  const { address } = useWallet();
  const [form, setForm] = useState<FormData>(DEFAULTS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setEvidenceMode(mode: EvidenceMode) {
    setForm((prev) => ({
      ...prev,
      evidenceMode: mode,
      evidenceSchema: EVIDENCE_SCHEMAS[mode],
    }));
  }

  async function handleCreate() {
    if (!address) { setError("Connect your wallet first."); return; }
    if (
      !form.title.trim() ||
      !form.acceptanceCriteria.trim() ||
      !form.requiredEvidence.trim() ||
      !form.evidenceSchema.trim()
    ) {
      setError("Title, acceptance criteria, required evidence, and evidence schema are required.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const count = await getBountyCount();
      await createBounty(form);
      const predictedId = `bounty_${count + 1}`;
      // Brief pause so the contract has a head-start before the detail page polls
      await new Promise((r) => setTimeout(r, 2000));
      router.push(`/bounty/${predictedId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <section className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-4">
        <h2 className="font-semibold text-[#F8FAFC]">Bounty Details</h2>

        <Field label="Title" required>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Clear, specific bounty title"
            className={inputCls}
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            placeholder="What do you need built / researched / created? Give context…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputCls}
            >
              {BOUNTY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Deadline note">
            <input
              value={form.deadlineNote}
              onChange={(e) => set("deadlineNote", e.target.value)}
              placeholder="e.g. 2 weeks from funding"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Max winners">
            <input
              type="number"
              min={1}
              value={form.maxWinners}
              onChange={(e) => set("maxWinners", parseInt(e.target.value) || 1)}
              className={inputCls}
            />
          </Field>

          <Field label={`Pass threshold: ${form.passThreshold}%`}>
            <input
              type="range"
              min={50}
              max={100}
              value={form.passThreshold}
              onChange={(e) => set("passThreshold", parseInt(e.target.value))}
              className="w-full accent-[#38BDF8] mt-2"
            />
            <div className="flex justify-between text-xs text-[#475569] mt-1">
              <span>50%</span><span>75%</span><span>100%</span>
            </div>
          </Field>
        </div>
      </section>

      {/* Criteria */}
      <section className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-4">
        <div className="flex items-start gap-2">
          <h2 className="font-semibold text-[#F8FAFC]">Evaluation Criteria</h2>
          <div className="flex items-center gap-1 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/30 px-2 py-0.5 text-xs text-[#A78BFA]">
            <Info size={10} /> Locks on first submission
          </div>
        </div>
        <p className="text-xs text-[#94A3B8]">
          These criteria will be locked on-chain when the first submission arrives.
          GenLayer AI evaluates every submission against these — and only these.
        </p>

        <Field label="Acceptance criteria" required>
          <textarea
            value={form.acceptanceCriteria}
            onChange={(e) => set("acceptanceCriteria", e.target.value)}
            rows={5}
            placeholder={`List each requirement on a new line, e.g.:\n- Working demo deployed to a public URL\n- Source code on GitHub with README\n- Passes all unit tests`}
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="Rejection criteria">
          <textarea
            value={form.rejectionCriteria}
            onChange={(e) => set("rejectionCriteria", e.target.value)}
            rows={3}
            placeholder={`What would cause an automatic reject?\n- Plagiarised from existing work\n- Broken demo with no fallback`}
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="Required evidence" required>
          <textarea
            value={form.requiredEvidence}
            onChange={(e) => set("requiredEvidence", e.target.value)}
            rows={3}
            placeholder={`What must contributors provide?\n- Live demo URL\n- Loom walkthrough video\n- GitHub repo link`}
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="Evidence verification mode" required>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["repo_demo", "Repo + demo"],
              ["pull_request", "Pull request"],
              ["research_report", "Research"],
              ["custom", "Custom"],
            ] as Array<[EvidenceMode, string]>).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setEvidenceMode(mode)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  form.evidenceMode === mode
                    ? "border-[#38BDF8] bg-[#38BDF8]/10 text-[#38BDF8]"
                    : "border-[#1E293B] bg-[#111827] text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Locked evidence schema" required>
          <textarea
            value={form.evidenceSchema}
            onChange={(e) => set("evidenceSchema", e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </Field>
      </section>

      {/* Options */}
      <section className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-4">
        <h2 className="font-semibold text-[#F8FAFC]">Options</h2>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.revisionAllowed}
            onChange={(e) => set("revisionAllowed", e.target.checked)}
            className="mt-0.5 accent-[#38BDF8]"
          />
          <div>
            <span className="text-sm text-[#F8FAFC]">Allow one revision</span>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Contributors who receive REVISION verdict get one chance to resubmit.
            </p>
          </div>
        </label>

        {form.revisionAllowed && (
          <Field label="Revision notes">
            <textarea
              value={form.revisionNotes}
              onChange={(e) => set("revisionNotes", e.target.value)}
              rows={2}
              placeholder="What should the contributor fix in their revision?"
              className={`${inputCls} resize-none`}
            />
          </Field>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPrivate}
            onChange={(e) => set("isPrivate", e.target.checked)}
            className="mt-0.5 accent-[#38BDF8]"
          />
          <div>
            <span className="text-sm text-[#F8FAFC]">Private bounty</span>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Private bounties carry a 3% protocol fee (vs 2% for public).
            </p>
          </div>
        </label>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-4">
          <p className="text-sm text-[#EF4444]">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#94A3B8]">
          After creation you will fund this bounty with native GEN.
        </p>
        <button
          onClick={handleCreate}
          disabled={pending || !address}
          className="px-6 py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {!address ? "Connect wallet to create" : "Create Bounty"}
        </button>
      </div>
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
