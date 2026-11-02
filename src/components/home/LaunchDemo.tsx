"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";

const COINS = [
  { name: "Debit Coin", symbol: "DBT" },
  { name: "Orbit", symbol: "ORB" },
  { name: "Moonbean", symbol: "BEAN" },
  { name: "Satori", symbol: "SAT" },
];
const STEPS = ["Metadata pinned to IPFS", "Transaction built", "Signed · live on pump.fun"];

function FakeInput({
  value,
  placeholder,
  caret,
  style,
}: {
  value: string;
  placeholder: string;
  caret: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className="input flex items-center overflow-hidden text-[13px]" style={{ height: 44, ...style }}>
      <span className="truncate">{value}</span>
      {caret && <span className="caret" />}
      {!value && !caret && <span className="text-fg-3">{placeholder}</span>}
      {!value && caret && <span className="sr-only">{placeholder}</span>}
    </div>
  );
}

/** Looping animation that types a coin name/ticker and ticks through the launch steps. */
export function LaunchDemo() {
  const [coinIndex, setCoinIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [step, setStep] = useState(-1);

  const coin = COINS[coinIndex];
  const full = `${coin.name} ${coin.symbol}`;
  const name = full.slice(0, Math.min(typed, coin.name.length));
  const symbol = typed > coin.name.length + 1 ? full.slice(coin.name.length + 1, typed) : "";
  const typingName = typed <= coin.name.length;
  const typingSymbol = typed > coin.name.length && typed < full.length;

  useEffect(() => {
    if (typed < full.length) {
      const t = setTimeout(() => setTyped((n) => n + 1), 60 + 50 * Math.random());
      return () => clearTimeout(t);
    }
    if (step < STEPS.length - 1) {
      const t = setTimeout(() => setStep((s) => s + 1), step < 0 ? 500 : 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setTyped(0);
      setStep(-1);
      setCoinIndex((i) => (i + 1) % COINS.length);
    }, 2400);
    return () => clearTimeout(t);
  }, [typed, step, full.length]);

  const done = step === STEPS.length - 1;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Launch</span>
        <span className="text-[11px] text-fg-3">One signature</span>
      </div>

      <div className="mt-4 flex items-center" style={{ gap: 10 }}>
        <motion.div
          key={coinIndex}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="grid shrink-0 place-items-center rounded-xl border border-dashed border-line-strong bg-bg-elev text-[13px] font-semibold text-fg-2"
          style={{ width: 44, height: 44 }}
        >
          {symbol.slice(0, 2) || name.slice(0, 1) || "+"}
        </motion.div>
        <FakeInput style={{ flex: 1, minWidth: 0 }} placeholder="Name" value={name} caret={typingName} />
        <FakeInput style={{ width: 84, flexShrink: 0 }} placeholder="SYM" value={symbol} caret={typingSymbol} />
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {STEPS.map((label, i) => {
          const complete = step >= i;
          const active = step === i - 1 && typed >= full.length;
          return (
            <li key={label} className="flex items-center gap-2.5 text-[13px]">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${
                  complete ? "border-green bg-green text-black" : active ? "border-fg-2" : "border-line-strong"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {complete ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, ease: EASE }}
                    >
                      <Icons.Check width={11} height={11} strokeWidth={3} />
                    </motion.span>
                  ) : active ? (
                    <motion.span
                      key="active"
                      className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-fg-3/40 border-t-fg-2"
                    />
                  ) : null}
                </AnimatePresence>
              </span>
              <span
                className={`transition-colors duration-300 ${complete ? "text-fg" : active ? "text-fg-2" : "text-fg-3"}`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex items-center justify-between pt-4">
        <AnimatePresence mode="wait">
          <motion.span
            key={done ? "ready" : step < 0 ? "typing" : "working"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={`text-[12px] ${done ? "text-green" : "text-fg-3"}`}
          >
            {done ? "Fees now route to your Apple Pay card" : step < 0 ? "Filling in details…" : "Launching…"}
          </motion.span>
        </AnimatePresence>
        <motion.span
          animate={{ opacity: done ? 1 : 0.45 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="btn btn-primary"
          style={{ height: 34, padding: "0 16px", fontSize: 12 }}
        >
          {done ? (
            <>
              <Icons.Check width={13} height={13} /> Launched
            </>
          ) : (
            "Launch"
          )}
        </motion.span>
      </div>
    </div>
  );
}
