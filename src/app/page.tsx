"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllBounties, getBountyCount, getSubmissionCount } from "@/lib/genlayer";
import type { Bounty } from "@/lib/types";
import { BountyCard } from "@/components/BountyCard";
import { StatCard } from "@/components/StatCard";
import { ArrowRight, Loader2, Shield, Brain, Lock, Zap } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export default function HomePage() {
  const [bountyCount, setBountyCount] = useState<number | null>(null);
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [count, subCount, all] = await Promise.all([
        getBountyCount(),
        getSubmissionCount(),
        getAllBounties(12),
      ]);
      setBountyCount(count);
      setSubmissionCount(subCount);
      setBounties(all);
      setLoading(false);
    }
    load();
  }, []);

  const openBounties = bounties.filter((b) => b.status === "open");
  const fundedOpen = openBounties.filter((b) => b.funded);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        {!CONTRACT_ADDRESS && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-1.5 text-xs text-[#EF4444] mb-6">
            ⚠ Contract address not configured — set NEXT_PUBLIC_BOUNTYLENS_CONTRACT_ADDRESS
          </div>
        )}

        <div className="inline-flex items-center gap-2 rounded-full border border-[#1E293B] bg-[#0F172A] px-4 py-1.5 text-xs text-[#94A3B8] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          Live on GenLayer Studionet · Native GEN escrow
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-[#F8FAFC] leading-tight mb-6">
          AI-judged bounties with{" "}
          <span className="text-[#38BDF8]">real on-chain escrow</span>.
        </h1>

        <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed">
          Post a bounty, lock the criteria on-chain, fund with native GEN.
          GenLayer evaluates every submission — PASS triggers automatic payout.
          No multisig. No politics.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/create"
            className="px-8 py-3.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold flex items-center gap-2 transition-colors"
          >
            Create a Bounty <ArrowRight size={16} />
          </Link>
          <a
            href="#bounties"
            className="px-8 py-3.5 rounded-xl border border-[#1E293B] text-[#F8FAFC] font-semibold hover:bg-[#0F172A] transition-colors"
          >
            Browse Bounties
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Bounties"
            value={bountyCount ?? "—"}
            sub="on GenLayer"
          />
          <StatCard
            label="Total Submissions"
            value={submissionCount ?? "—"}
            sub="AI-evaluated"
          />
          <StatCard
            label="Open Bounties"
            value={loading ? "—" : openBounties.length}
            sub="accepting work"
          />
          <StatCard
            label="Funded & Active"
            value={loading ? "—" : fundedOpen.length}
            sub="real GEN escrowed"
          />
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-[#1E293B] bg-[#0F172A] py-14">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Lock size={20} className="text-[#A78BFA]" />,
              title: "Criteria Lock",
              desc: "Criteria lock immutably on first submission. Posters can't move goalposts.",
            },
            {
              icon: <Brain size={20} className="text-[#38BDF8]" />,
              title: "GenLayer AI Judge",
              desc: "Every submission evaluated against locked criteria. Consistent, explainable.",
            },
            {
              icon: <Shield size={20} className="text-[#22C55E]" />,
              title: "Duplicate Detection",
              desc: "Copy-paste farming caught automatically across all bounty submissions.",
            },
            {
              icon: <Zap size={20} className="text-[#F59E0B]" />,
              title: "Auto Payout",
              desc: "PASS verdict triggers automatic native GEN transfer. No waiting.",
            },
          ].map((f, i) => (
            <div key={i} className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#111827] border border-[#1E293B] flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-semibold text-[#F8FAFC] text-sm">{f.title}</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bounty list */}
      <section id="bounties" className="max-w-5xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#F8FAFC]">Live Bounties</h2>
          {loading && <Loader2 size={16} className="animate-spin text-[#38BDF8]" />}
        </div>

        {!loading && bounties.length === 0 && (
          <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-12 text-center">
            <p className="text-[#94A3B8] mb-4">No bounties yet.</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm transition-colors"
            >
              Post the first bounty <ArrowRight size={14} />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bounties.map((b) => (
            <BountyCard key={b.id} bounty={b} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F172A] border-t border-[#1E293B] py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#F8FAFC] mb-4">
            Build something. Get paid in GEN.
          </h2>
          <p className="text-[#94A3B8] mb-8">
            Connect your wallet, find an open bounty, and submit your work.
            GenLayer decides. The contract pays. No middleman.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              className="px-8 py-3.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold transition-colors"
            >
              Post a Bounty
            </Link>
            <a
              href="#bounties"
              className="px-8 py-3.5 rounded-xl border border-[#1E293B] text-[#F8FAFC] font-semibold hover:bg-[#111827] transition-colors"
            >
              Browse Open Bounties
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
