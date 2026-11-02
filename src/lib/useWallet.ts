"use client";

import { useConnectWallet } from "@privy-io/react-auth";
import { useSignTransaction, useWallets, type ConnectedStandardSolanaWallet } from "@privy-io/react-auth/solana";
import { VersionedTransaction } from "@solana/web3.js";
import { useCallback } from "react";

/** Privy's own embedded wallet registers under this name; launchers use their external wallet. */
const EMBEDDED = "Privy";

export function isEmbedded(w: ConnectedStandardSolanaWallet) {
  return w.standardWallet.name === EMBEDDED;
}

/** The launcher's external Solana wallet (Phantom, Solflare, …) via Privy. */
export function useWallet() {
  const { ready, wallets } = useWallets();
  const { connectWallet } = useConnectWallet();
  const { signTransaction: privySign } = useSignTransaction();
  const wallet = ready ? (wallets.find((w) => !isEmbedded(w)) ?? null) : null;

  const signTransaction = useCallback(
    async (tx: VersionedTransaction): Promise<VersionedTransaction> => {
      if (!wallet) throw new Error("Wallet not connected");
      const { signedTransaction } = await privySign({ transaction: tx.serialize(), wallet });
      return VersionedTransaction.deserialize(signedTransaction);
    },
    [wallet, privySign],
  );

  return {
    address: wallet?.address ?? null,
    connected: !!wallet,
    connect: () => connectWallet({ walletChainType: "solana-only" }),
    /** Disconnects the wallet (Privy has no account sheet for external wallets). */
    account: () => wallet?.disconnect(),
    signTransaction,
  };
}
