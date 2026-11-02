"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { CoinCard } from "@/components/CoinCard";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";
import type { Coin } from "@/lib/types";

const PAGE_SIZE = 8;

export function TopTokens({ coins, solUsd }: { coins: Coin[]; solUsd?: number | null }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(coins.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = coins.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="text-[24px] font-semibold tracking-[-0.025em]">Top tokens</h2>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-fg-3">
          <Link href="/explore" className="btn btn-ghost h-8 px-2.5 text-[12px]">
            View all
          </Link>
          <button
            className="icon-btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={current === 0}
            aria-label="Previous"
          >
            <Icons.Arrow width={13} height={13} className="rotate-180" />
          </button>
          <span className="tabular-nums">
            {current + 1} / {pages}
          </span>
          <button
            className="icon-btn"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={current >= pages - 1}
            aria-label="Next"
          >
            <Icons.Arrow width={13} height={13} />
          </button>
        </div>
      </div>

      {coins.length === 0 ? (
        <div className="card flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <p className="text-[15px] font-medium">Nothing launched yet.</p>
          <p className="max-w-sm text-[13px] text-fg-3">Launch takes a name, a symbol, an image, and one signature.</p>
          <Link href="/launch" className="btn btn-primary mt-2">
            Launch coin
          </Link>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {visible.map((coin, i) => (
              <motion.div
                key={coin.mint}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
              >
                <CoinCard coin={coin} solUsd={solUsd} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
