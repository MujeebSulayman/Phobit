"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { defaultSolanaRpcsPlugin, toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

const solanaConnectors = toSolanaWalletConnectors();
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

/**
 * Privy handles both sides of the app:
 * - recipients sign in on /claim with their phone number + SMS code only, and get the Solana wallet
 *   that was created for that number at launch time;
 * - launchers connect an external Solana wallet (Phantom, Solflare, …) to sign launches.
 */
export function Providers({ children }: { children: ReactNode }) {
  if (PRIVY_APP_ID.length !== 25)
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is missing or invalid. Copy it from dashboard.privy.io → Settings → Basics.");
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["sms"],
        appearance: { theme: "dark", accentColor: "#ffffff", walletChainType: "solana-only" },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: { solana: { connectors: solanaConnectors } },
        plugins: [defaultSolanaRpcsPlugin()],
      }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </PrivyProvider>
  );
}
