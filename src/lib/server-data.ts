import "server-only";
import { HttpError } from "@/server/http";
import type { Coin, FeedItem } from "@/lib/types";
import { solUsd } from "@/server/prices";
import * as q from "@/server/queries";

/** Server-rendered pages read the database directly. Failures render as empty states, not errors. */
async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) console.warn(`[server-data] ${label}: ${e.message}`);
    else console.error(`[server-data] ${label}`, e);
    return fallback;
  }
}

export async function getCoins(): Promise<{ coins: Coin[]; solUsd: number | null }> {
  const [coins, sol] = await Promise.all([safe("coins", () => q.listCoins(), [] as Coin[]), solUsd()]);
  return { coins, solUsd: sol };
}

export function getCoin(mint: string): Promise<Coin | null> {
  return safe(`coin ${mint}`, () => q.getCoin(mint), null);
}

export async function getFeed(): Promise<FeedItem[]> {
  const payouts = await safe("feed", () => q.listPayouts({ limit: 3 }), []);
  return payouts.map((p) => ({
    id: p.id,
    coin: p.coin?.name ?? "Several coins",
    recipient: p.recipient ?? "",
    usdCents: p.usd_cents ?? 0,
    status: p.status,
    createdAt: p.created_at,
  }));
}

export async function getFees(): Promise<{ series: number[]; totalUsd: number; payouts: number }> {
  const data = await safe("fees", () => q.analytics(30), null);
  if (!data) return { series: Array(30).fill(0), totalUsd: 0, payouts: 0 };
  return { series: data.series.map((d) => d.usdCents / 100), totalUsd: data.totals.usdCents / 100, payouts: data.totals.payouts };
}
