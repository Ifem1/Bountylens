type Props = {
  label: string;
  value: string | number;
  sub?: string;
};

export function StatCard({ label, value, sub }: Props) {
  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#0F172A] p-5">
      <p className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#F8FAFC]">{value}</p>
      {sub && <p className="text-xs text-[#94A3B8] mt-1">{sub}</p>}
    </div>
  );
}
