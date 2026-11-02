import Link from "next/link";
import { Icons } from "@/components/icons";
import { formatSol, formatUsdCompact, ipfsImage, shortAddress, timeAgo } from "@/lib/format";
import type { Coin } from "@/lib/types";

export function coinState(coin: Coin): "paying" | "claimed" | "unclaimed" {
  return coin.recipient.cardActive ? "paying" : coin.recipient.claimed ? "claimed" : "unclaimed";
}

export function CoinCard({ coin, solUsd }: { coin: Coin; solUsd?: number | null }) {
  const image = ipfsImage(coin.image_url, 512);
  const lamports = Number(coin.fees_swept_lamports);
  const usd = solUsd != null ? (lamports / 1e9) * solUsd : null;
  const state = coinState(coin);

  return (
    <Link href={`/coin/${coin.mint}`} className="card card-hover group flex flex-col overflow-hidden cursor-pointer">
      <div className="relative aspect-square overflow-hidden bg-card-2">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl font-semibold text-fg-3">{coin.symbol.slice(0, 2)}</div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white/85 backdrop-blur">
          {timeAgo(coin.created_at)}
        </span>
        <span
          className={`absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] backdrop-blur ${
            state === "paying" ? "text-green" : state === "claimed" ? "text-amber" : "text-white/70"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              state === "paying" ? "bg-green" : state === "claimed" ? "bg-amber" : "bg-white/50"
            }`}
          />
          {state === "paying" ? "Paying out" : state === "claimed" ? "Claimed" : "Unclaimed"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{coin.name}</h3>
          <span className="shrink-0 text-[12px] text-fg-3">
            ${coin.symbol}
            <span className="text-fg-3/60"> / AAPLx</span>
          </span>
        </div>
        {coin.description && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-fg-3">{coin.description}</p>
        )}
        <dl className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[12px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-3">Fees to</dt>
            <dd className="inline-flex min-w-0 items-center gap-1.5 text-fg-2">
              <Icons.Apple width={12} height={12} className="shrink-0" />
              <span className="truncate font-mono text-[11.5px]">{coin.recipient.masked}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-3">Swept</dt>
            <dd className="tabular-nums text-fg-2">
              {lamports > 0 ? (
                <>
                  {formatSol(lamports, 3)}
                  {usd != null && <span className="text-fg-3"> · {formatUsdCompact(usd)}</span>}
                </>
              ) : (
                <span className="text-fg-3">—</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-3">Launched by</dt>
            <dd className="font-mono text-[11.5px] text-fg-2">{shortAddress(coin.creator_wallet)}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
