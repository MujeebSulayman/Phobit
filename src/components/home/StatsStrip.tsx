"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { EASE } from "@/components/motion";

function Counter({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (n) => format(n));
  useEffect(() => {
    if (!inView) return;
    if (reduce) return mv.set(value);
    const c = animate(mv, value, { duration: 1.6, ease: EASE });
    return () => c.stop();
  }, [inView, reduce, value, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 });
const int = (n: number) => Math.round(n).toLocaleString("en-US");

/** Live platform numbers in a single liquid-glass bar. */
export function StatsStrip({ feesUsd, coins, payouts }: { feesUsd: number; coins: number; payouts: number }) {
  const stats: [string, number, (n: number) => string][] = [
    ["Fees routed · 30d", feesUsd, usd],
    ["Coins launched", coins, int],
    ["Payouts", payouts, int],
    ["Held by Phobit", 0, usd],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: EASE }}
      className="glass glass-refract grid grid-cols-2 overflow-hidden rounded-[24px] md:grid-cols-4"
    >
      {stats.map(([label, value, format], i) => (
        <div key={label} className={`px-6 py-6 ${i ? "border-white/[0.07] md:border-l" : ""} ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t md:border-t-0" : ""}`}>
          <div className="eyebrow">{label}</div>
          <div className="mt-2 font-display text-[32px] font-semibold tracking-[-0.04em]">
            <Counter value={value} format={format} />
          </div>
          {label === "Held by Phobit" && <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent">non-custodial</div>}
        </div>
      ))}
    </motion.div>
  );
}
