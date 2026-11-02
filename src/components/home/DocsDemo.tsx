"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/motion";

const ROWS = [
  ["phone", "e164", "+1 ••• ••• 0123"],
  ["wallet", "32", "privy_wallet(phone)"],
  ["creator", "32", "= wallet"],
  ["vault", "32", "pda(creator)"],
  ["payout", "usdc", "swap(fees) → wallet"],
];

export function DocsDemo() {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="eyebrow">The number is the account</div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-fg-3">
        A wallet is made for the number at launch and set as the coin&apos;s creator. Nobody else holds the fees.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30 font-mono text-[11px]">
        <div className="grid grid-cols-[72px_40px_1fr] gap-2 border-b border-line px-3 py-1.5 text-[10px] uppercase tracking-wider text-fg-3">
          <span>Field</span>
          <span>Len</span>
          <span>Value</span>
        </div>
        {ROWS.map((row, i) => (
          <motion.div
            key={row[0]}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 + 0.12 * i, ease: EASE }}
            className="grid grid-cols-[72px_40px_1fr] gap-2 px-3 py-1.5 text-fg-2 odd:bg-white/[0.015]"
          >
            <span className="text-fg">{row[0]}</span>
            <span className="text-fg-3">{row[1]}</span>
            <span className="truncate">{row[2]}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
