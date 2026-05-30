"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type WalletCtx = {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  connecting: boolean;
};

const WalletContext = createContext<WalletCtx>({
  address: null,
  connect: async () => {},
  disconnect: () => {},
  connecting: false,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts[0]) setAddress(accounts[0].toLowerCase());
      })
      .catch(() => {});

    const handler = (accounts: string[]) =>
      setAddress(accounts[0]?.toLowerCase() || null);
    eth.on("accountsChanged", handler);
    return () => eth.removeListener?.("accountsChanged", handler);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  const connect = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    if (!eth) {
      alert("No wallet detected. Please install MetaMask or another Web3 wallet.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]?.toLowerCase() || null);
    } catch {
      // user rejected
    } finally {
      setConnecting(false);
    }
  }, []);

  return (
    <WalletContext.Provider value={{ address, connect, disconnect, connecting }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
