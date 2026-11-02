"use client";

import { useEffect, useState } from "react";
import { Sparkline } from "@/components/analytics/Sparkline";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatSol, formatUsdCompact } from "@/lib/format";
import type { AnalyticsResponse } from "@/lib/types";

function Stat({ label, value, sub }: { label: string; value: string | null; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="text-[12px] text-fg-3">{label}</div>
      {value === null ? (
        <div className="skeleton mt-2 h-8 w-24 rounded-md" />
      ) : (
        <div className="mt-1 text-[26px] font-semibold tracking-[-0.03em]">{value}</div>
      )}
      {sub && <div className="text-[12px] text-fg-3">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null);
  }, []);

  const daily = data?.series.map((d) => d.usdCents / 100) ?? [];
  const max = Math.max(1, ...daily);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Analytics" subtitle="Platform-wide creator fees, last 30 days." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Fees swept"
          value={data ? formatUsdCompact(data.totals.usdCents / 100) : null}
          sub={data ? formatSol(data.totals.lamports, 2) : undefined}
        />
        <Stat
          label="Payouts"
          value={data ? String(data.totals.payouts) : null}
          sub={data ? `${data.totals.paid} sent to cards` : undefined}
        />
        <Stat label="Live coins" value={data ? String(data.totals.coins) : null} />
        <Stat label="Cards on file" value={data ? String(data.totals.recipients) : null} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium">Daily fees · USD</div>
          <div className="text-[12px] text-fg-3">{data?.solUsd ? `SOL ${formatUsdCompact(data.solUsd)}` : ""}</div>
        </div>
        <div className="mt-4">
          {data ? (
            <div className="flex h-[180px] items-end gap-[3px]">
              {daily.map((usd, i) => (
                <div key={i} className="group relative flex-1">
                  <div
                    className="w-full rounded-t-[3px] bg-fg/80 transition-colors group-hover:bg-fg"
                    style={{ height: `${Math.max(2, (usd / max) * 180)}px` }}
                  />
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-card-2 px-1.5 py-0.5 text-[11px] group-hover:block">
                    {data.series[i].date.slice(5)} · {formatUsdCompact(usd)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="skeleton h-[180px] rounded-xl" />
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 pt-5 text-[13px] font-medium">Trend</div>
        <Sparkline values={daily} height={110} className="mt-2" />
      </div>
    </div>
  );
}
