"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { EASE } from "@/components/motion";
import { RollingNumber } from "@/components/ui/RollingNumber";

type Range = "1D" | "30D";

export function FeesChart({ series, totalUsd }: { series: number[]; totalUsd: number }) {
  const [range, setRange] = useState<Range>("30D");
  const data = range === "1D" ? series.slice(-2) : series;
  const total = (range === "1D" ? data.reduce((a, b) => a + b, 0) : totalUsd).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const empty = data.every((v) => v === 0);
  const max = Math.max(1, ...data);
  // Draw a gentle placeholder wave when there's no data.
  const points = empty
    ? Array.from({ length: 30 }, (_, i) => 0.25 + 0.2 * Math.sin(i / 4.5) + 0.1 * Math.sin(i / 1.7))
    : data.length > 1
      ? data
      : [0, 0];
  const scale = empty ? 1 : max;
  const line = points
    .map((v, i) => [(i / (Math.max(2, points.length) - 1)) * 400, 88 - (v / scale) * 72])
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L400,96 L0,96 Z`;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] text-fg-3">Fees · {range === "1D" ? "today" : "30 days"}</div>
          <div className="mt-2 text-[36px] font-semibold tracking-[-0.035em]">
            <RollingNumber key={range} value={`$${total}`} delay={0.2} />
          </div>
          {empty && <div className="mt-2 text-[12px] text-fg-3">No sweeps yet — fees appear here as coins trade.</div>}
        </div>
        <div className="flex gap-1">
          {(["1D", "30D"] as const).map((r) => (
            <button
              key={r}
              className="pill h-7 px-2.5 text-[11px]"
              data-active={range === r}
              onClick={(e) => {
                // The chart sits inside a <Link> card; don't navigate when switching range.
                e.preventDefault();
                setRange(r);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-5 -mb-1 mt-auto">
        <svg viewBox="0 0 400 96" preserveAspectRatio="none" className="block h-[96px] w-full">
          <defs>
            <linearGradient id="fees-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity={empty ? 0.06 : 0.16} />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            key={`${range}-a`}
            d={area}
            fill="url(#fees-fill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
          />
          <motion.path
            key={`${range}-l`}
            d={line}
            fill="none"
            stroke="white"
            strokeOpacity={empty ? 0.28 : 0.8}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, delay: 0.2, ease: EASE }}
          />
        </svg>
      </div>
    </div>
  );
}
