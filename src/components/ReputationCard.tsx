import type { ContributorProfile, PosterProfile } from "@/lib/types";

const TIER_COLORS: Record<string, string> = {
  New: "text-[#94A3B8] border-[#94A3B8]/30 bg-[#94A3B8]/10",
  Active: "text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/10",
  Trusted: "text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10",
  Expert: "text-[#A78BFA] border-[#A78BFA]/30 bg-[#A78BFA]/10",
  Legend: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10",
};

export function ContributorCard({ profile }: { profile: ContributorProfile }) {
  const tierStyle = TIER_COLORS[profile.reputation_tier] || TIER_COLORS.New;

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#F8FAFC]">Contributor Record</h3>
        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${tierStyle}`}>
          {profile.reputation_tier}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="Submitted" value={profile.total_attempted} />
        <Stat label="Passed" value={profile.total_passed} />
        <Stat label="Rejected" value={profile.total_rejected} />
        <Stat label="Revisions" value={profile.total_revisions} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[#94A3B8]">Pass rate</span>
          <span className="text-[#F8FAFC] font-semibold">{profile.pass_rate.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-[#1E293B] rounded-full h-1.5">
          <div
            className="bg-[#22C55E] h-1.5 rounded-full transition-all"
            style={{ width: `${Math.min(100, profile.pass_rate)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#94A3B8]">Rep score</span>
          <span className="text-[#38BDF8] font-semibold">{profile.reputation_score}</span>
        </div>
        {profile.total_earned && profile.total_earned !== "0" && (
          <div className="flex justify-between text-sm">
            <span className="text-[#94A3B8]">Total earned</span>
            <span className="text-[#22C55E] font-semibold">{profile.total_earned} GEN</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PosterCard({ profile }: { profile: PosterProfile }) {
  const trustColor =
    profile.poster_trust_score >= 80
      ? "text-[#22C55E]"
      : profile.poster_trust_score >= 50
      ? "text-[#F59E0B]"
      : "text-[#EF4444]";

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[#F8FAFC]">Poster Record</h3>
        <span className={`text-sm font-bold ${trustColor}`}>
          Trust {profile.poster_trust_score}/100
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Posted" value={profile.bounties_posted} />
        <Stat label="Funded" value={profile.bounties_funded} />
        <Stat label="Completed" value={profile.bounties_completed} />
        <Stat label="Cancelled" value={profile.cancellation_count} />
      </div>

      {profile.total_rewards_paid && profile.total_rewards_paid !== "0" && (
        <div className="mt-3 pt-3 border-t border-[#1E293B] flex justify-between text-sm">
          <span className="text-[#94A3B8]">Total paid out</span>
          <span className="text-[#22C55E] font-semibold">{profile.total_rewards_paid} GEN</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#111827] p-3">
      <p className="text-xs text-[#94A3B8]">{label}</p>
      <p className="text-lg font-bold text-[#F8FAFC]">{value}</p>
    </div>
  );
}
