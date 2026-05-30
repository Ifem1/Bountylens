"use client";

import { useState } from "react";
import { fundBounty } from "@/lib/genlayer";
import { parseGenToWei } from "@/lib/format";
import { AlertTriangle, Loader2, ExternalLink } from "lucide-react";

type Props = {
  bountyId: string;
  onSuccess: () => void;
};

export function FundBountyBox({ bountyId, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    if (!amount.trim()) return;
    setError(null);
    setPending(true);
    try {
      const valueInWei = parseGenToWei(amount);
      const hash = await fundBounty(bountyId, valueInWei);
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
        <p className="text-sm font-semibold text-[#22C55E] mb-1">Funding submitted!</p>
        <p className="text-xs text-[#94A3B8] font-mono break-all">{txHash}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-[#F8FAFC] mb-0.5">Fund this Bounty</h3>
        <p className="text-xs text-[#94A3B8]">Transfer native GEN to the escrow contract.</p>
      </div>

      <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-3 flex gap-2">
        <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#F59E0B] leading-relaxed">
          You are funding this bounty with real native GEN. Funds will be escrowed by the
          BountyLens contract and paid out automatically on PASS verdicts.
        </p>
      </div>

      <div>
        <label className="block text-xs text-[#94A3B8] mb-1.5">Amount (GEN)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            className="flex-1 bg-[#111827] border border-[#1E293B] rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
          <button
            onClick={handleFund}
            disabled={pending || !amount.trim()}
            className="px-4 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            Fund
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 p-3">
          <p className="text-xs text-[#EF4444]">{error}</p>
        </div>
      )}
    </div>
  );
}
