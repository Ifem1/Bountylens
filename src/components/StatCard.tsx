"use client";

import { useCountUp } from "@/lib/hooks";

type Props = {
  label: string;
  value: number | null;
  sub?: string;
};

export function StatCard({ label, value, sub }: Props) {
  const animated = useCountUp(value);
  const display = value == null ? "—" : animated;
  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5 lift">
      <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#F8FAFC] tabular-nums">{display}</p>
      {sub && <p className="text-xs text-[#94A3B8] mt-1">{sub}</p>}
    </div>
  );
}
