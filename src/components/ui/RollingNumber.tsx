"use client";

import { motion } from "framer-motion";

const DIGITS = Array.from({ length: 20 }, (_, i) => i % 10);

/** Odometer-style number: each digit spins into place. */
export function RollingNumber({ value, className = "", delay = 0 }: { value: string; className?: string; delay?: number }) {
  let digitIndex = 0;
  return (
    <span className={`inline-flex items-stretch leading-none tabular-nums ${className}`} aria-label={value}>
      {value.split("").map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span
              key={i}
              className="inline-block h-[1em] leading-none"
              style={{ width: ch === "." || ch === "," ? "0.3em" : undefined }}
              aria-hidden
            >
              {ch}
            </span>
          );
        }
        const n = Number(ch);
        const order = digitIndex++;
        return (
          <span key={i} className="relative inline-block h-[1em] overflow-hidden leading-none" style={{ width: "0.6em" }} aria-hidden>
            <motion.span
              className="absolute left-0 top-0 flex w-full flex-col items-center leading-none"
              initial={{ y: 0 }}
              animate={{ y: `-${10 + n}em` }}
              transition={{ type: "spring", stiffness: 55, damping: 14, mass: 0.8, delay: delay + 0.06 * order }}
            >
              {DIGITS.map((d, k) => (
                <span key={k} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
