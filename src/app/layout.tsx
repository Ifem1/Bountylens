import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BountyLens — AI-judged bounties with real on-chain escrow",
  description:
    "Post DAO bounties with locked criteria, fund with native GEN, and let GenLayer AI evaluate every submission automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#070A12]">
        <WalletProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[#1E293B] py-6 mt-16">
            <div className="max-w-7xl mx-auto px-4 text-center text-xs text-[#475569]">
              BountyLens — DAO bounties with native GEN escrow, powered by GenLayer Intelligent Contracts.
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
