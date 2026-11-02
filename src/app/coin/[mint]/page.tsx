/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { coinState } from "@/components/CoinCard";
import { Icons } from "@/components/icons";
import { formatSol, formatUsdCompact, ipfsImage, shortAddress, timeAgo } from "@/lib/format";
import { getCoin, getCoins } from "@/lib/server-data";

export const revalidate = 30;

type Props = { params: Promise<{ mint: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const coin = await getCoin((await params).mint);
  return coin ? { title: `${coin.name} ($${coin.symbol})` } : {};
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-fg-3">{k}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

const STATE_LABEL = { paying: "Paying out", claimed: "Claimed", unclaimed: "Unclaimed" } as const;
const STATE_CLS = {
  paying: "text-green border-green/30",
  claimed: "text-amber border-amber/30",
  unclaimed: "text-fg-2 border-line",
} as const;

export default async function CoinPage({ params }: Props) {
  const { mint } = await params;
  const [coin, { solUsd }] = await Promise.all([getCoin(mint), getCoins()]);
  if (!coin) notFound();

  const image = ipfsImage(coin.image_url, 768);
  const swept = Number(coin.fees_swept_lamports);
  const state = coinState(coin);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="card overflow-hidden">
          <div className="grid gap-6 p-6 sm:grid-cols-[160px_1fr] sm:p-7">
            <div className="aspect-square overflow-hidden rounded-2xl bg-card-2">
              {image ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-4xl font-semibold text-fg-3">{coin.symbol.slice(0, 2)}</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-medium ${STATE_CLS[state]}`}>
                  {STATE_LABEL[state]}
                </span>
                <span className="text-[12px] text-fg-3">Launched {timeAgo(coin.created_at)} ago</span>
              </div>
              <h1 className="mt-3 truncate text-[34px] font-semibold leading-none tracking-[-0.035em]">{coin.name}</h1>
              <div className="mt-2 text-[14px] text-fg-3">
                ${coin.symbol} <span className="text-fg-3/60">/ AAPLx · pump.fun</span>
              </div>
              {coin.description && <p className="mt-4 text-[14px] leading-relaxed text-fg-2">{coin.description}</p>}
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`https://pump.fun/coin/${coin.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary h-9 px-4 text-[13px]"
                >
                  Trade on pump.fun <Icons.External width={13} height={13} />
                </a>
                <a
                  href={`https://solscan.io/token/${coin.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary h-9 px-4 text-[13px]"
                >
                  Solscan
                </a>
                {coin.twitter && (
                  <a href={coin.twitter} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 px-3 text-[13px]">
                    <Icons.X width={13} height={13} /> X
                  </a>
                )}
                {coin.website && (
                  <a href={coin.website} target="_blank" rel="noreferrer" className="btn btn-ghost h-9 px-3 text-[13px]">
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-[12px] text-fg-3">Fees swept</div>
            <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">{swept > 0 ? formatSol(swept, 3) : "—"}</div>
            {swept > 0 && solUsd != null && (
              <div className="text-[12px] text-fg-3">{formatUsdCompact((swept / 1e9) * solUsd)}</div>
            )}
          </div>
          <div className="card p-5">
            <div className="text-[12px] text-fg-3">Unswept</div>
            <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
              {coin.unswept_lamports != null ? formatSol(coin.unswept_lamports, 3) : "—"}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-[12px] text-fg-3">Market cap</div>
            <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
              {coin.market_cap_usd != null ? formatUsdCompact(coin.market_cap_usd) : "—"}
            </div>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className="px-5 pt-5">
            <div className="eyebrow">Fee routing</div>
          </div>
          <div className="mt-2 divide-y divide-line text-[13px]">
            <Row k="Fees to">
              <span className="inline-flex items-center gap-1.5">
                <Icons.Apple width={13} height={13} />
                <span className="font-mono text-[12px]">{coin.recipient.masked}</span>
              </span>
            </Row>
            <Row k="Creator fee">3% of every trade</Row>
            <Row k="Launched by">
              <span className="font-mono text-[12px]">{shortAddress(coin.creator_wallet, 6)}</span>
            </Row>
            <Row k="Mint">
              <span className="font-mono text-[12px]">{shortAddress(coin.mint, 6)}</span>
            </Row>
            {coin.fee_vault && (
              <Row k="Fee vault">
                <a
                  className="font-mono text-[12px] hover:underline"
                  href={`https://solscan.io/account/${coin.fee_vault}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddress(coin.fee_vault, 6)}
                </a>
              </Row>
            )}
          </div>
        </div>
        <div className="card p-5">
          <div className="eyebrow">Is this your number?</div>
          <p className="mt-2 text-[13px] leading-relaxed text-fg-2">
            Fees from this coin are held for {coin.recipient.masked}. Verify it once and every sweep lands on your Phobit
            card in USD.
          </p>
          <Link href="/claim" className="btn btn-apple mt-4 w-full">
            <Icons.Apple width={16} height={16} /> Claim fees
          </Link>
        </div>
      </aside>
    </div>
  );
}
