"use client";

import { createAppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana } from "@reown/appkit/networks";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

createAppKit({
  adapters: [new SolanaAdapter()],
  networks: [solana],
  projectId: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "",
  metadata: {
    name: "Debit",
    description: "Creator fees, straight to Apple Pay.",
    url: SITE_URL,
    icons: [`${SITE_URL}/logo-192.png`],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#ffffff",
    "--w3m-color-mix": "#000000",
    "--w3m-color-mix-strength": 20,
    "--w3m-border-radius-master": "2px",
    "--w3m-font-family": "var(--font-geist-sans), -apple-system, system-ui, sans-serif",
  },
  features: { analytics: false, email: false, socials: false },
});

export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
