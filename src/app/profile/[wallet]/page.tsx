"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getContributorProfile,
  getPosterProfile,
  getBounty,
  getSubmission,
} from "@/lib/genlayer";
import { safeJsonParse, shortAddress } from "@/lib/format";
import type { ContributorProfile, PosterProfile, Bounty, Submission } from "@/lib/types";
import { ContributorCard, PosterCard } from "@/components/ReputationCard";
import { BountyCard } from "@/components/BountyCard";
import { ReviewPanel } from "@/components/ReviewPanel";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { wallet } = useParams<{ wallet: string }>();
  const addr = wallet.toLowerCase();

  const [loading, setLoading] = useState(true);
  const [contrib, setContrib] = useState<ContributorProfile | null>(null);
  const [poster, setPoster] = useState<PosterProfile | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);

  useEffect(() => {
    async function load() {
      const [cp, pp] = await Promise.all([
        getContributorProfile(addr),
        getPosterProfile(addr),
      ]);
      setContrib(cp);
      setPoster(pp);

      if (cp?.submission_ids) {
        const ids = safeJsonParse<string[]>(cp.submission_ids, []);
        const subs = await Promise.all(ids.map((id) => getSubmission(id)));
        setSubmissions(subs.filter(Boolean) as Submission[]);
      }

      if (pp?.bounties_posted_ids) {
        const ids = safeJsonParse<string[]>(pp.bounties_posted_ids, []);
        const bs = await Promise.all(ids.map((id) => getBounty(id)));
        setBounties(bs.filter(Boolean) as Bounty[]);
      }

      setLoading(false);
    }
    load();
  }, [addr]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[#38BDF8]" />
      </div>
    );
  }

  const hasActivity = contrib || poster;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#38BDF8] to-[#A78BFA] flex items-center justify-center text-[#070A12] font-bold text-xl">
            {addr[2]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[#F8FAFC]">{shortAddress(addr)}</p>
            <p className="text-xs font-mono text-[#475569] mt-0.5 break-all">{addr}</p>
          </div>
          {contrib && (
            <div className="ml-auto">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                  contrib.reputation_tier === "Legend"
                    ? "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10"
                    : contrib.reputation_tier === "Expert"
                    ? "text-[#A78BFA] border-[#A78BFA]/30 bg-[#A78BFA]/10"
                    : contrib.reputation_tier === "Trusted"
                    ? "text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10"
                    : contrib.reputation_tier === "Active"
                    ? "text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/10"
                    : "text-[#94A3B8] border-[#94A3B8]/30 bg-[#94A3B8]/10"
                }`}
              >
                {contrib.reputation_tier}
              </span>
            </div>
          )}
        </div>
      </div>

      {!hasActivity ? (
        <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-12 text-center">
          <p className="text-[#94A3B8]">No on-chain activity found for this address.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {contrib && <ContributorCard profile={contrib} />}
          {poster && <PosterCard profile={poster} />}

          {submissions.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#F8FAFC] mb-4">
                Submissions ({submissions.length})
              </h2>
              <div className="space-y-4">
                {submissions.map((s) => (
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
            </section>
          )}

          {bounties.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#F8FAFC] mb-4">
                Posted Bounties ({bounties.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bounties.map((b) => (
                  <BountyCard key={b.id} bounty={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
