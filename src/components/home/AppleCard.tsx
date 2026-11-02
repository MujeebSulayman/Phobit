"use client";

import { motion } from "framer-motion";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";

function Chip() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="33" height="25" rx="5" fill="url(#chip)" stroke="rgba(255,255,255,0.25)" />
      <path d="M11 .5v25M23 .5v25M.5 9h10M.5 17h10M23 9h10.5M23 17h10.5M11 13h12" stroke="rgba(0,0,0,0.35)" />
      <defs>
        <linearGradient id="chip" x1="0" y1="0" x2="34" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9d4c7" />
          <stop offset="1" stopColor="#8e8a80" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AppleCard() {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Fees route to</span>
        <span className="text-[11px] text-fg-3">Apple Pay · Debit</span>
      </div>
      <div className="flex flex-1 items-center py-3" style={{ perspective: 1000 }}>
        <motion.div
          animate={{ y: [0, -5, 0], rotateX: [0, 3, 0], rotateY: [0, -4, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="sheen relative aspect-[1.586] w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_80px_-32px_rgba(0,0,0,1),inset_0_1px_0_rgba(255,255,255,0.08)]"
          style={{
            background: "radial-gradient(120% 90% at 0% 0%, #2c2c31 0%, #19191c 45%, #0b0b0c 100%)",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)" }}
          />
          <div className="relative flex h-full flex-col justify-between p-[6%]">
            <div className="flex items-start justify-between">
              <Icons.Apple width={26} height={26} />
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-fg-2">
                Debit
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <Chip />
                <div className="mt-3 font-mono text-[clamp(12px,3.6cqw,15px)] tracking-[0.2em] text-fg">
                  <span className="text-fg-3">•••• •••• ••••</span> 4242
                </div>
              </div>
              <motion.span
                className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2 py-1 text-[11px] font-medium text-green"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: EASE }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green" /> Instant
              </motion.span>
            </div>
          </div>
        </motion.div>
      </div>
      <p className="text-[12.5px] leading-snug text-fg-3">The recipient picks a card once. Every sweep lands on it, in USD.</p>
    </div>
  );
}
