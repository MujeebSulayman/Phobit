"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CoinCard, coinState } from "@/components/CoinCard";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";
import { formatSol } from "@/lib/format";
import type { Coin } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unclaimed", label: "Unclaimed" },
  { id: "claimed", label: "Claimed" },
  { id: "paying", label: "Paying out" },
] as const;

const SORTS = [
  { id: "new", label: "Newest" },
  { id: "swept", label: "Most swept" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];
type Sort = (typeof SORTS)[number]["id"];

function matches(coin: Coin, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase().replace(/^\$/, "");
  return (
    coin.name.toLowerCase().includes(needle) ||
    coin.symbol.toLowerCase().includes(needle) ||
    coin.mint.toLowerCase() === needle ||
    coin.creator_wallet.toLowerCase() === needle
  );
}

export function ExploreGrid({ coins, solUsd }: { coins: Coin[]; solUsd: number | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");

  const visible = useMemo(() => {
    const list = coins.filter((c) => matches(c, query.trim()) && (filter === "all" || coinState(c) === filter));
    return list.sort((a, b) =>
      sort === "swept"
        ? Number(b.fees_swept_lamports) - Number(a.fees_swept_lamports)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [coins, query, filter, sort]);

  const totalSwept = coins.reduce((sum, c) => sum + Number(c.fees_swept_lamports), 0);

  return (
    <>
      <div className="card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6 px-1 text-[12px] text-fg-3">
          <div>
            <div>Coins</div>
            <div className="mt-0.5 text-[18px] font-semibold tabular-nums text-fg">{coins.length}</div>
          </div>
          <div>
            <div>Swept</div>
            <div className="mt-0.5 text-[18px] font-semibold tabular-nums text-fg">{formatSol(totalSwept, 2)}</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-[240px]">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-3">
              <Icons.Search width={14} height={14} />
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                const q = e.target.value.trim();
                router.replace(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore", { scroll: false });
              }}
              placeholder="Name, ticker or wallet"
              aria-label="Filter coins"
              className="input h-9 rounded-full pl-9 text-[13px]"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f.id} className="pill" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
            <span className="mx-1 hidden w-px self-stretch bg-line sm:block" />
            {SORTS.map((s) => (
              <button key={s.id} className="pill" data-active={sort === s.id} onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <p className="text-[15px] font-medium">{coins.length === 0 ? "Nothing launched yet." : "No coins match."}</p>
          <p className="max-w-sm text-[13px] text-fg-3">
            {coins.length === 0
              ? "Launch takes a name, a symbol, an image, and one signature."
              : "Try a different name, ticker or wallet address."}
          </p>
          {coins.length === 0 && (
            <Link href="/launch" className="btn btn-primary mt-2">
              Launch coin
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((coin, i) => (
            <motion.div
              key={coin.mint}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: Math.min(i, 12) * 0.04, ease: EASE }}
            >
              <CoinCard coin={coin} solUsd={solUsd} />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
