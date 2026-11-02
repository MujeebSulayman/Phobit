"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/motion";

const ROWS = [
  ["seed", "32", "HMAC(master, mint)"],
  ["creator", "32", "ed25519(seed).pub"],
  ["vault", "32", "pda(creator)"],
  ["fees", "u64", "balance(vault)"],
  ["card", "—", "usd(fees) → Apple Pay"],
];

export function DocsDemo() {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="eyebrow">Attribution is per-mint</div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-fg-3">
        One derived creator key per coin. Its vault balance is exactly that coin&apos;s unswept fees.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-bg-elev font-mono text-[11px]">
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
