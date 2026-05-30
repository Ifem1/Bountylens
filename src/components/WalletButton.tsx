"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletProvider";
import { shortAddress } from "@/lib/format";
import { Wallet, ChevronDown, LogOut, Copy, Check } from "lucide-react";

export function WalletButton() {
  const { address, connect, disconnect, connecting } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!address) {
    return (
      <button
        onClick={connect}
        disabled={connecting}
        className="flex items-center gap-2 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#070A12] font-semibold text-sm px-4 py-2 transition-colors disabled:opacity-60"
      >
        <Wallet size={15} />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[#1E293B] bg-[#111827] hover:border-[#38BDF8]/40 px-3.5 py-2 text-sm font-mono text-[#38BDF8] transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-[#22C55E] flex-shrink-0" />
        {shortAddress(address)}
        <ChevronDown size={13} className={`text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[#1E293B] bg-[#0F172A] shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#1E293B]">
            <p className="text-xs text-[#94A3B8] mb-0.5">Connected</p>
            <p className="text-xs font-mono text-[#F8FAFC] break-all">{address}</p>
          </div>

          <button
            onClick={copyAddress}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827] transition-colors"
          >
            {copied ? <Check size={14} className="text-[#22C55E]" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy address"}
          </button>

          <button
            onClick={() => { disconnect(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
