import Link from "next/link";
import type { Bounty } from "@/lib/types";
import { formatWeiToGen } from "@/lib/format";
import { Lock } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
  completed: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
  cancelled: "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/30",
};

export function BountyCard({ bounty }: { bounty: Bounty }) {
  const escrow = bounty.escrow_amount
    ? formatWeiToGen(bounty.escrow_amount)
    : null;

  return (
    <Link
      href={`/bounty/${bounty.id}`}
      className="block rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5 hover:border-[#38BDF8]/40 group lift"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full border bg-[#111827] text-[#94A3B8] border-[#1E293B]">
          {bounty.category}
        </span>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
            STATUS_STYLES[bounty.status] || STATUS_STYLES.cancelled
          }`}
        >
          {bounty.status}
        </span>
      </div>

      <h3 className="font-semibold text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors line-clamp-2 mb-2">
        {bounty.title}
      </h3>

      <p className="text-xs text-[#94A3B8] line-clamp-2 mb-4">
        {bounty.description}
      </p>

      <div className="flex items-center justify-between text-xs">
        <div>
          {escrow ? (
            <span className="text-[#38BDF8] font-semibold">
              {escrow} GEN
            </span>
          ) : bounty.funded ? (
            <span className="text-[#22C55E]">Funded</span>
          ) : (
            <span className="text-[#F59E0B]">Awaiting funding</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[#94A3B8]">
          {bounty.criteria_locked && (
            <span className="flex items-center gap-1 text-[#A78BFA]">
              <Lock size={10} /> Locked
            </span>
          )}
          <span>
            {bounty.winner_count}/{bounty.max_winners} winners
          </span>
        </div>
      </div>
    </Link>
  );
}
