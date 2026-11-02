"use client";

import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import type { Provider } from "@reown/appkit-adapter-solana/react";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";

/** Solana wallet state from Reown AppKit, safe to read during SSR/hydration. */
export function useWallet() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount({ namespace: "solana" });
  const { walletProvider } = useAppKitProvider<Provider>("solana");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const signTransaction = useCallback(
    async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (!walletProvider) throw new Error("Wallet not connected");
      return walletProvider.signTransaction(tx);
    },
    [walletProvider],
  );

  const connected = mounted && !!(isConnected && address);
  return {
    address: connected ? address! : null,
    connected,
    connect: () => open({ view: "Connect" }),
    account: () => open({ view: "Account" }),
    signTransaction,
  };
}
