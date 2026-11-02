import "server-only";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { AnalyticsResponse, Coin, Payout, RecipientDashboard, RecipientWallet } from "@/lib/types";
import type { Me } from "./auth";
import { decrypt } from "./crypto";
import { db, must, type CardRow, type CoinRow, type PayoutRow, type RecipientRow } from "./db";
import { SOL_MINT, USDC_MINT } from "./env";
import { usdPrices } from "./prices";
import { feeVault, liveState, quoteMint, vaultBalance } from "./pump";
import { connection } from "./solana";

const COIN_SELECT = "*, recipient:recipients(kind, masked, status, claimed_at)";
const PAYOUT_SELECT =
  "id, mint, lamports, usdc_amount, usd_cents, status, sweep_signature, created_at, coin:coins(name, symbol, image_url), recipient:recipients(masked)";

type CoinJoined = CoinRow & { recipient: Pick<RecipientRow, "kind" | "masked" | "status" | "claimed_at"> | null };
type PayoutJoined = Pick<
  PayoutRow,
  "id" | "mint" | "lamports" | "usdc_amount" | "usd_cents" | "status" | "sweep_signature" | "created_at"
> & { coin: Payout["coin"]; recipient: { masked: string } | null };

function toCoin(row: CoinJoined): Coin {
  return {
    mint: row.mint,
    name: row.name,
    symbol: row.symbol,
    description: row.description,
    image_url: row.image_url,
    creator_wallet: row.creator_wallet,
    fees_swept_lamports: Number(row.fees_swept_lamports),
    created_at: row.created_at,
    twitter: row.twitter,
    website: row.website,
    recipient: {
      kind: row.recipient?.kind ?? "phone",
      masked: row.recipient?.masked ?? "•••",
      claimed: !!row.recipient?.claimed_at,
      cardActive: row.recipient?.status === "active",
    },
  };
}

function toPayout(row: PayoutJoined): Payout {
  return {
    id: row.id,
    mint: row.mint,
    lamports: Number(row.lamports),
    usdc_amount: row.usdc_amount == null ? null : Number(row.usdc_amount),
    usd_cents: row.usd_cents == null ? null : Number(row.usd_cents),
    status: row.status as Payout["status"],
    sweep_signature: row.sweep_signature,
    created_at: row.created_at,
    coin: row.coin ?? null,
    recipient: row.recipient?.masked ?? null,
  };
}

export async function listCoins(wallet?: string | null): Promise<Coin[]> {
  let q = db().from("coins").select(COIN_SELECT).order("created_at", { ascending: false }).limit(500);
  if (wallet) q = q.eq("creator_wallet", wallet);
  return must(await q).map((r) => toCoin(r as CoinJoined));
}

/** Raw quote units → indicative USD, or null without a price. */
async function quoteToUsd(raw: bigint): Promise<number | null> {
  const [prices, quote] = await Promise.all([usdPrices(), quoteMint()]);
  const p = prices[quote.mint.toBase58()];
  return p ? (Number(raw) / 10 ** quote.decimals) * p : null;
}

/**
 * One coin plus live on-chain state. The fee vault belongs to the recipient's wallet, so if they are
 * named on several coins, "unswept" covers all of them. Chain failures degrade to nulls.
 */
export async function getCoin(mint: string): Promise<Coin | null> {
  const row = must(await db().from("coins").select(COIN_SELECT).eq("mint", mint).maybeSingle()) as CoinJoined | null;
  if (!row) return null;
  const coin = toCoin(row);
  const creator = new PublicKey(row.creator_key);
  coin.fee_vault = feeVault(creator);
  coin.unswept_lamports = null;
  coin.market_cap_usd = null;
  try {
    const state = await liveState(new PublicKey(mint), creator);
    const [unsweptUsd, mcapUsd, prices] = await Promise.all([
      quoteToUsd(state.unsweptQuote),
      state.marketCapQuote == null ? null : quoteToUsd(state.marketCapQuote),
      usdPrices(),
    ]);
    const sol = prices[SOL_MINT];
    if (unsweptUsd != null && sol) coin.unswept_lamports = Math.round((unsweptUsd / sol) * 1e9);
    coin.market_cap_usd = mcapUsd;
  } catch (e) {
    console.error(`[coin] live state unavailable for ${mint}`, e);
  }
  return coin;
}

export async function listPayouts({ limit = 100, recipientKey }: { limit?: number; recipientKey?: string } = {}) {
  let q = db()
    .from("payouts")
    .select(PAYOUT_SELECT)
    .neq("status", "sweeping")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));
  if (recipientKey) q = q.eq("recipient_key", recipientKey);
  return must(await q).map((r) => toPayout(r as unknown as PayoutJoined));
}

export async function analytics(days = 30): Promise<Omit<AnalyticsResponse, "solUsd">> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const [totals, daily] = await Promise.all([
    db().from("platform_totals").select("*").single(),
    db().from("daily_fees").select("day, usd_cents").gte("day", since),
  ]);
  const t = must(totals) as Record<string, number>;
  const byDay = new Map(must(daily).map((d: { day: string; usd_cents: number }) => [d.day, Number(d.usd_cents)]));
  const series = Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { date, usdCents: byDay.get(date) ?? 0 };
  });
  return {
    totals: {
      usdCents: Number(t.usd_cents),
      lamports: Number(t.lamports),
      payouts: Number(t.payouts),
      paid: Number(t.paid),
      coins: Number(t.coins),
      recipients: Number(t.recipients),
    },
    series,
  };
}

export async function activeCard(recipientKey: string): Promise<CardRow | null> {
  return must(
    await db().from("cards").select("*").eq("recipient_key", recipientKey).eq("status", "active").maybeSingle(),
  ) as CardRow | null;
}

/** USDC held by `owner`, in raw units (6 decimals). */
export async function usdcBalance(owner: PublicKey): Promise<bigint> {
  try {
    const ata = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), owner, true);
    return BigInt((await connection().getTokenAccountBalance(ata, "confirmed")).value.amount);
  } catch {
    return 0n; // no USDC account yet
  }
}

async function walletSummary(r: RecipientRow): Promise<RecipientWallet | null> {
  if (!r.wallet_address) return null;
  const owner = new PublicKey(r.wallet_address);
  const [usdc, unclaimed] = await Promise.all([
    usdcBalance(owner).catch(() => 0n),
    vaultBalance(owner)
      .then(quoteToUsd)
      .catch(() => null),
  ]);
  return {
    address: r.wallet_address,
    usdcCents: Math.floor(Number(usdc) / 1e4),
    unclaimedCents: unclaimed == null ? null : Math.floor(unclaimed * 100),
    autoPayouts: r.auto_payouts,
  };
}

const IN_FLIGHT = new Set(["swept", "swapped", "submitted"]);

export async function dashboard(me: Me): Promise<RecipientDashboard> {
  const [recipient, card, coins, payouts] = await Promise.all([
    db().from("recipients").select("*").eq("key", me.key).maybeSingle(),
    activeCard(me.key),
    db()
      .from("coins")
      .select("mint, name, symbol, image_url, fees_swept_lamports")
      .eq("recipient_key", me.key)
      .order("created_at", { ascending: false }),
    listPayouts({ limit: 200, recipientKey: me.key }),
  ]);
  const r = must(recipient) as RecipientRow | null;

  const totals = { settledCents: 0, inFlightCents: 0, waitingCents: 0, count: payouts.length };
  for (const p of payouts) {
    const cents = p.usd_cents ?? 0;
    if (p.status === "paid") totals.settledCents += cents;
    else if (p.status === "unrouted") totals.waitingCents += cents;
    else if (IN_FLIGHT.has(p.status)) totals.inFlightCents += cents;
  }

  return {
    me: { masked: me.masked },
    recipient: r && {
      status: r.status,
      card_display_name: null,
      card: card && {
        pan: decrypt(card.pan_enc),
        exp: card.exp,
        cvv: decrypt(card.cvv_enc),
        wallet_added_at: card.wallet_added_at,
      },
    },
    coins: must(coins).map((c: Record<string, unknown>) => ({
      ...c,
      fees_swept_lamports: Number(c.fees_swept_lamports),
    })) as RecipientDashboard["coins"],
    wallet: r ? await walletSummary(r) : null,
    payouts,
    totals,
  };
}
