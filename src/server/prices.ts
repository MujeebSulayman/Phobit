import "server-only";
import { env, SOL_MINT } from "./env";
import { jupiterFetch } from "./jupiter";

type Cached = { at: number; prices: Record<string, number> };
let cache: Cached | null = null;
const TTL_MS = 60_000;

/** USD prices from Jupiter, cached for a minute. Missing mints are absent from the result. */
export async function usdPrices(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.prices;
  const ids = [SOL_MINT, env.quoteMint()];
  const data = await jupiterFetch<Record<string, { usdPrice?: number } | null>>(`/price/v3?ids=${ids.join(",")}`);
  const prices: Record<string, number> = {};
  for (const id of ids) {
    const p = data[id]?.usdPrice;
    if (typeof p === "number" && p > 0) prices[id] = p;
  }
  cache = { at: Date.now(), prices };
  return prices;
}

export async function solUsd(): Promise<number | null> {
  try {
    return (await usdPrices())[SOL_MINT] ?? null;
  } catch (e) {
    console.warn("[prices] SOL price unavailable:", e instanceof Error ? e.message : e);
    return null;
  }
}
