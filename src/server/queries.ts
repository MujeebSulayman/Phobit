import "server-only";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import type { AnalyticsResponse, Coin, Payout, RecipientDashboard, RecipientWallet } from "@/lib/types";
import type { Me } from "./auth";
import { decrypt } from "./crypto";
import { one, sql, type CardRow, type CoinRow, type PayoutRow, type RecipientRow } from "./db";
import { SOL_MINT, USDC_MINT } from "./env";
import { usdPrices } from "./prices";
import { feeVault, liveState, quoteMint, vaultBalance } from "./pump";
import { connection } from "./solana";

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

/** Coins joined with their recipient's public fields; never selects the raw contact. */
function coins(where: { mint?: string; wallet?: string | null }) {
  const mint = where.mint ?? null;
  const wallet = where.wallet ?? null;
  return sql<CoinJoined>`
    select c.*, json_build_object('kind', r.kind, 'masked', r.masked, 'status', r.status, 'claimed_at', r.claimed_at) as recipient
    from coins c
    join recipients r on r.key = c.recipient_key
    where (${mint}::text is null or c.mint = ${mint})
      and (${wallet}::text is null or c.creator_wallet = ${wallet})
    order by c.created_at desc
    limit 500`;
}

export async function listCoins(wallet?: string | null): Promise<Coin[]> {
  return (await coins({ wallet })).map(toCoin);
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
  const row = await one(coins({ mint }));
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
  const key = recipientKey ?? null;
  const rows = await sql<PayoutJoined>`
    select p.id, p.mint, p.lamports, p.usdc_amount, p.usd_cents, p.status, p.sweep_signature, p.created_at,
           case when c.mint is null then null
                else json_build_object('name', c.name, 'symbol', c.symbol, 'image_url', c.image_url) end as coin,
           json_build_object('masked', r.masked) as recipient
    from payouts p
    left join coins c on c.mint = p.mint
    join recipients r on r.key = p.recipient_key
    where p.status <> 'sweeping' and (${key}::text is null or p.recipient_key = ${key})
    order by p.created_at desc
    limit ${Math.min(Math.max(limit, 1), 500)}`;
  return rows.map(toPayout);
}

export async function analytics(days = 30): Promise<Omit<AnalyticsResponse, "solUsd">> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const [[t], daily] = await Promise.all([
    sql<Record<string, number>>`select * from platform_totals`,
    sql<{ day: string; usd_cents: number }>`select day, usd_cents from daily_fees where day >= ${since}::date`,
  ]);
  const byDay = new Map(daily.map((d) => [d.day, Number(d.usd_cents)]));
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
  return one(sql<CardRow>`select * from cards where recipient_key = ${recipientKey} and status = 'active'`);
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
  const [r, card, myCoins, payouts] = await Promise.all([
    one(sql<RecipientRow>`select * from recipients where key = ${me.key}`),
    activeCard(me.key),
    sql<RecipientDashboard["coins"][number]>`
      select mint, name, symbol, image_url, fees_swept_lamports from coins
      where recipient_key = ${me.key} order by created_at desc`,
    listPayouts({ limit: 200, recipientKey: me.key }),
  ]);

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
    coins: myCoins,
    wallet: r ? await walletSummary(r) : null,
    payouts,
    totals,
  };
}
