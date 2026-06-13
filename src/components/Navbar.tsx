"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const NAV = [
  { label: "Explore", href: "/" },
  { label: "Create", href: "/create" },
  { label: "Dashboard", href: "/dashboard" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#1E293B] bg-[#070A12]/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-[#F8FAFC] text-lg tracking-tight">
            <img src="/logo.svg" alt="" width={24} height={24} className="rounded-full" />
            Bounty<span className="text-[#38BDF8]">Lens</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === n.href
                    ? "bg-[#0F172A] text-[#38BDF8]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
