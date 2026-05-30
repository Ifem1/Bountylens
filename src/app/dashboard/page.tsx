"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import {
  getContributorProfile,
  getPosterProfile,
  getBounty,
  getSubmission,
} from "@/lib/genlayer";
import { safeJsonParse } from "@/lib/format";
import type { Bounty, Submission, ContributorProfile, PosterProfile } from "@/lib/types";
import { BountyCard } from "@/components/BountyCard";
import { ContributorCard, PosterCard } from "@/components/ReputationCard";
import { ReviewPanel } from "@/components/ReviewPanel";
import { Loader2, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { address, connect } = useWallet();
  const [tab, setTab] = useState<"contributor" | "poster">("contributor");
  const [loading, setLoading] = useState(false);

  const [contribProfile, setContribProfile] = useState<ContributorProfile | null>(null);
  const [posterProfile, setPosterProfile] = useState<PosterProfile | null>(null);
  const [mySubmissions, setMySubmissions] = useState<Submission[]>([]);
  const [myBounties, setMyBounties] = useState<Bounty[]>([]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    async function load() {
      const [cp, pp] = await Promise.all([
        getContributorProfile(address!),
        getPosterProfile(address!),
      ]);
      setContribProfile(cp);
      setPosterProfile(pp);

      // Load submissions from contributor profile index
      if (cp?.submission_ids) {
        const ids = safeJsonParse<string[]>(cp.submission_ids, []);
        const subs = await Promise.all(ids.map((id) => getSubmission(id)));
        setMySubmissions(subs.filter(Boolean) as Submission[]);
      }

      // Load bounties from poster profile index
      if (pp?.bounties_posted_ids) {
        const ids = safeJsonParse<string[]>(pp.bounties_posted_ids, []);
        const bounties = await Promise.all(ids.map((id) => getBounty(id)));
        setMyBounties(bounties.filter(Boolean) as Bounty[]);
      }

      setLoading(false);
    }

    load();
  }, [address]);

  if (!address) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Connect your wallet</h2>
        <p className="text-sm text-[#94A3B8] mb-6">
          Connect to view your bounties, submissions, and reputation.
        </p>
        <button
          onClick={connect}
          className="px-6 py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold transition-colors"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Dashboard</h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">{address}</p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin text-[#38BDF8]" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-[#0F172A] rounded-xl p-1 border border-[#1E293B] w-fit">
        {(["contributor", "poster"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-[#111827] text-[#38BDF8]"
                : "text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Contributor tab */}
      {tab === "contributor" && (
        <div className="space-y-8">
          {contribProfile ? (
            <ContributorCard profile={contribProfile} />
          ) : !loading ? (
            <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-8 text-center">
              <p className="text-[#94A3B8] text-sm mb-4">No contributor record yet.</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-[#38BDF8] hover:underline"
              >
                Browse open bounties <ArrowRight size={14} />
              </Link>
            </div>
          ) : null}

          {mySubmissions.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[#F8FAFC] mb-4">
                My Submissions ({mySubmissions.length})
              </h2>
              <div className="space-y-4">
                {mySubmissions.map((s) => (
                  <div key={s.id} className="space-y-3">
                    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          href={`/bounty/${s.bounty_id}`}
                          className="text-sm font-medium text-[#38BDF8] hover:underline"
                        >
                          {s.bounty_id}
                        </Link>
                        <span className="text-xs text-[#475569]">{s.id}</span>
                      </div>
                      <p className="text-xs text-[#94A3B8] line-clamp-2">{s.description}</p>
                    </div>
                    <ReviewPanel submission={s} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Poster tab */}
      {tab === "poster" && (
        <div className="space-y-8">
          {posterProfile ? (
            <PosterCard profile={posterProfile} />
          ) : !loading ? (
            <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-8 text-center">
              <p className="text-[#94A3B8] text-sm mb-4">No bounties posted yet.</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm transition-colors"
              >
                Post a bounty <ArrowRight size={14} />
              </Link>
            </div>
          ) : null}

          {myBounties.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[#F8FAFC] mb-4">
                My Bounties ({myBounties.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myBounties.map((b) => (
                  <BountyCard key={b.id} bounty={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
