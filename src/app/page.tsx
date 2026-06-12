"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllBounties, getBountyCount, getSubmissionCount } from "@/lib/genlayer";
import type { Bounty } from "@/lib/types";
import { BountyCard } from "@/components/BountyCard";
import { StatCard } from "@/components/StatCard";
import { ArrowRight, Shield, Brain, Lock, Zap } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { useReveal } from "@/lib/hooks";

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

  const featuresRef = useReveal<HTMLDivElement>();
  const bountiesRef = useReveal<HTMLDivElement>();
  const ctaRef = useReveal<HTMLDivElement>();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 text-center overflow-hidden">
        {/* Drifting gradient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-[420px] h-[420px] rounded-full bg-[#38BDF8]/10 blur-3xl drift-a" />
          <div className="absolute bottom-0 right-1/4 w-[380px] h-[380px] rounded-full bg-[#A78BFA]/10 blur-3xl drift-b" />
        </div>

        {!CONTRACT_ADDRESS && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-1.5 text-xs text-[#EF4444] mb-6">
            ⚠ Contract address not configured — set NEXT_PUBLIC_BOUNTYLENS_CONTRACT_ADDRESS
          </div>
        )}

        <div className="inline-flex items-center gap-2 rounded-full border border-[#1E293B] bg-[#0F172A] px-4 py-1.5 text-xs text-[#94A3B8] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] live-dot" />
          Live on GenLayer Studionet · Native GEN escrow
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-[#F8FAFC] leading-tight mb-6">
          AI-judged bounties with{" "}
          <span className="text-[#38BDF8]">
            real <span className="whitespace-nowrap">on-chain</span> escrow
          </span>
          .
        </h1>

        <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed">
          Post a bounty, lock the criteria on-chain, fund with native GEN.
          GenLayer evaluates every submission — PASS triggers automatic payout.
          No multisig. No politics.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/create"
            className="cta-primary px-9 py-4 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-base flex items-center gap-2"
          >
            Create a Bounty <ArrowRight size={18} />
          </Link>
          <a
            href="#bounties"
            className="px-6 py-3 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] font-medium text-sm transition-colors"
          >
            Browse Bounties →
          </a>
        </div>

        {/* Pipeline diagram */}
        <Pipeline />
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Bounties" value={bountyCount} sub="on GenLayer" />
          <StatCard label="Total Submissions" value={submissionCount} sub="AI-evaluated" />
          <StatCard label="Open Bounties" value={loading ? null : openBounties.length} sub="accepting work" />
          <StatCard label="Funded & Active" value={loading ? null : fundedOpen.length} sub="real GEN escrowed" />
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-[#1E293B] bg-[#0F172A] py-14">
        <div ref={featuresRef} className="reveal max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div
              key={i}
              className="space-y-2"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
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
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="skeleton h-5 w-20 rounded-full" />
                  <div className="skeleton h-5 w-14 rounded-full" />
                </div>
                <div className="skeleton h-5 w-3/4 rounded mb-2" />
                <div className="skeleton h-3 w-full rounded mb-1.5" />
                <div className="skeleton h-3 w-5/6 rounded mb-4" />
                <div className="flex items-center justify-between">
                  <div className="skeleton h-4 w-16 rounded" />
                  <div className="skeleton h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && bounties.length === 0 && (
          <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-12 text-center">
            <p className="text-[#94A3B8] mb-4">No bounties yet.</p>
            <Link
              href="/create"
              className="cta-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm"
            >
              Post the first bounty <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {!loading && bounties.length > 0 && (
          <div ref={bountiesRef} className="reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bounties.map((b, i) => (
              <div key={b.id} style={{ transitionDelay: `${i * 50}ms` }}>
                <BountyCard bounty={b} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-[#0F172A] border-t border-[#1E293B] py-16 px-4">
        <div ref={ctaRef} className="reveal max-w-2xl mx-auto text-center">
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
              className="cta-primary px-8 py-3.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold"
            >
              Post a Bounty
            </Link>
            <a
              href="#bounties"
              className="px-6 py-3 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] font-medium text-sm transition-colors"
            >
              Browse Open Bounties →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Pipeline() {
  const stops: Array<{ label: string; color: string }> = [
    { label: "Poster", color: "#A78BFA" },
    { label: "Bounty", color: "#38BDF8" },
    { label: "Submission", color: "#F59E0B" },
    { label: "AI Judge", color: "#38BDF8" },
    { label: "Payout", color: "#22C55E" },
  ];
  return (
    <div className="max-w-2xl mx-auto select-none">
      <svg viewBox="0 0 480 60" className="w-full h-16" aria-hidden="true">
        <defs>
          <linearGradient id="pipe-stroke" x1="0" x2="1">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="pipe-token" r="0.5">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="1" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <line
          x1="0" y1="30" x2="480" y2="30"
          stroke="url(#pipe-stroke)" strokeWidth="1.5" strokeDasharray="3 4"
        />
        {stops.map((s, i) => {
          const x = i * 120;
          return (
            <g key={i}>
              <circle cx={x} cy={30} r={5} fill={s.color} opacity={0.95} />
              <circle cx={x} cy={30} r={9} fill={s.color} opacity={0.18} />
            </g>
          );
        })}
        {/* The flowing token */}
        <circle r="10" fill="url(#pipe-token)" className="token-flow" />
      </svg>
      <div className="flex justify-between px-1 -mt-2 text-[10px] uppercase tracking-wider text-[#94A3B8]">
        {stops.map((s, i) => (
          <span key={i} style={{ color: s.color, opacity: 0.85 }}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}
