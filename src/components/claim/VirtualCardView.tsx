"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";
import type { VirtualCard } from "@/lib/types";

function Chip() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="33" height="25" rx="5" fill="url(#vchip)" stroke="rgba(255,255,255,0.25)" />
      <path d="M11 .5v25M23 .5v25M.5 9h10M.5 17h10M23 9h10.5M23 17h10.5M11 13h12" stroke="rgba(0,0,0,0.35)" />
      <defs>
        <linearGradient id="vchip" x1="0" y1="0" x2="34" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9d4c7" />
          <stop offset="1" stopColor="#8e8a80" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function VirtualCardView({
  card,
  onAddToWallet,
  adding,
}: {
  card: VirtualCard;
  onAddToWallet: () => void;
  adding: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inWallet = !!card.wallet_added_at;

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  }

  return (
    <div>
      <motion.div
        initial={{ rotateY: -90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        style={{ transformPerspective: 1200 }}
        className="sheen relative aspect-[1.586] w-full overflow-hidden rounded-[22px] border border-white/10 shadow-[0_40px_80px_-32px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 0% 0%, #2c2c31 0%, #19191c 45%, #0b0b0c 100%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)" }}
        />
        <div className="relative flex h-full flex-col justify-between p-[6%]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icons.Apple width={22} height={22} />
              <span className="text-[13px] font-semibold tracking-tight">Debit</span>
            </div>
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-fg-2">
              Virtual · Debit
            </span>
          </div>
          <div>
            <Chip />
            <div className="mt-3 font-mono text-[clamp(14px,4cqw,19px)] tracking-[0.16em] text-fg">
              {revealed ? (
                card.pan.replace(/(\d{4})(?=\d)/g, "$1 ")
              ) : (
                <>
                  <span className="text-fg-3">•••• •••• ••••</span> {card.pan.slice(-4)}
                </>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <div className="flex gap-4 text-fg-3">
                <span>
                  EXP <span className="font-mono text-fg-2">{revealed ? card.exp : "••/••"}</span>
                </span>
                <span>
                  CVV <span className="font-mono text-fg-2">{revealed ? card.cvv : "•••"}</span>
                </span>
              </div>
              <span className="text-[12px] font-semibold italic tracking-tight text-fg">VISA</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setRevealed((r) => !r)} className="btn btn-secondary h-9 px-3.5 text-[12.5px]">
          {revealed ? "Hide details" : "Show details"}
        </button>
        {revealed && (
          <>
            <button onClick={() => copy("Number", card.pan)} className="pill">
              {copied === "Number" ? "Copied" : "Copy number"}
            </button>
            <button onClick={() => copy("Expiry", card.exp)} className="pill">
              {copied === "Expiry" ? "Copied" : "Copy expiry"}
            </button>
            <button onClick={() => copy("CVV", card.cvv)} className="pill">
              {copied === "CVV" ? "Copied" : "Copy CVV"}
            </button>
          </>
        )}
        <div className="ml-auto">
          {inWallet ? (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-green/10 px-3.5 text-[12.5px] font-medium text-green">
              <Icons.Check width={14} height={14} /> In Apple Wallet
            </span>
          ) : (
            <button onClick={onAddToWallet} disabled={adding} className="btn btn-apple h-9 px-3.5 text-[12.5px]">
              <Icons.Apple width={14} height={14} /> {adding ? "Adding…" : "Add to Apple Wallet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
