"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/motion";
import type { PayoutStatus } from "@/lib/types";

const STAGES = ["Swept", "USDC", "Bridging", "Settled"];

function stageIndex(status: PayoutStatus): number {
  switch (status) {
    case "swept":
      return 0;
    case "swapped":
    case "unrouted":
      return 1;
    case "submitted":
    case "failed":
      return 2;
    case "paid":
      return 3;
  }
}

/** Four-dot progress track for a payout: Swept → USDC → Bridging → Settled. */
export function StageTrack({ status, compact = false }: { status: PayoutStatus; compact?: boolean }) {
  const current = stageIndex(status);
  const settled = status === "paid";
  const stuck = status === "unrouted" || status === "failed";

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`} aria-label={`Stage: ${STAGES[current]}`}>
      {STAGES.map((label, i) => {
        const reached = i <= current;
        const isCurrent = i === current && !settled;
        return (
          <div key={label} className="flex items-center">
            <div className="relative flex flex-col items-center">
              <motion.span
                animate={isCurrent && !stuck ? { scale: [1, 1.25, 1], opacity: [1, 0.6, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity, ease: EASE }}
                className={`block rounded-full ${compact ? "h-1.5 w-1.5" : "h-2 w-2"} ${
                  settled ? "bg-green" : stuck && isCurrent ? "bg-amber" : reached ? "bg-fg" : "bg-line-strong"
                }`}
              />
              {!compact && <span className={`mt-1.5 text-[10px] ${reached ? "text-fg-2" : "text-fg-3"}`}>{label}</span>}
            </div>
            {i < STAGES.length - 1 && (
              <span
                className={`${compact ? "mx-0.5 w-4" : "mx-1 mb-4 w-8"} h-px ${
                  i < current ? (settled ? "bg-green/60" : "bg-fg/60") : "bg-line-strong"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
