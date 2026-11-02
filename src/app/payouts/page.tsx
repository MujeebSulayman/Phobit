"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCents, formatSol, ipfsImage, timeAgo } from "@/lib/format";
import type { Payout } from "@/lib/types";

const COLS = "sm:grid-cols-[1fr_170px_120px_120px_130px]";

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);

  useEffect(() => {
    fetch("/api/payouts?limit=100")
      .then((r) => r.json())
      .then((d) => setPayouts(d.payouts ?? []))
      .catch(() => setPayouts([]));
  }, []);

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Every fee sweep and who it went to."
        right={
          <Link href="/claim" className="btn btn-secondary h-9 px-4 text-[13px]">
            <Icons.Apple width={14} height={14} /> Claim fees
          </Link>
        }
      />
      <div className="card overflow-hidden">
        <div
          className={`hidden ${COLS} gap-4 border-b border-line px-5 py-3 text-[11px] uppercase tracking-wider text-fg-3 sm:grid`}
        >
          <span>Coin</span>
          <span>Recipient</span>
          <span className="text-right">Swept</span>
          <span className="text-right">USD</span>
          <span className="text-right">Status</span>
        </div>

        {payouts === null && (
          <div className="p-5">
            <div className="skeleton h-40 rounded-xl" />
          </div>
        )}

        {payouts?.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-card-2 text-fg-3">
              <Icons.Payments />
            </span>
            <p className="text-[13px] text-fg-3">No sweeps yet. The keeper runs on a schedule and records each one here.</p>
          </div>
        )}

        {payouts?.map((p) => {
          const img = ipfsImage(p.coin?.image_url, 72);
          return (
            <div
              key={p.id}
              className={`grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-5 py-3.5 last:border-0 ${COLS} sm:gap-4`}
            >
              <Link href={`/coin/${p.mint}`} className="flex min-w-0 items-center gap-3 cursor-pointer">
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-card-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">Fees · {p.coin?.name ?? p.mint.slice(0, 6)}</span>
                  <span className="block text-[12px] text-fg-3">
                    {timeAgo(p.created_at)} ago
                    {p.sweep_signature && (
                      <>
                        {" · "}
                        <a
                          className="hover:underline"
                          href={`https://solscan.io/tx/${p.sweep_signature}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          tx
                        </a>
                      </>
                    )}
                  </span>
                </span>
              </Link>
              <span className="hidden items-center gap-1.5 text-[13px] text-fg-2 sm:flex">
                <Icons.Apple width={13} height={13} /> {p.recipient}
              </span>
              <span className="hidden text-right text-[13px] sm:block">{formatSol(p.lamports)}</span>
              <span className="hidden text-right text-[13px] sm:block">{formatCents(p.usd_cents)}</span>
              <span className="flex justify-end">
                <StatusBadge status={p.status} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
