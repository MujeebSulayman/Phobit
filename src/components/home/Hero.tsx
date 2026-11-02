"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { EASE, Reveal, Words } from "@/components/motion";
import { RouteNetwork } from "./RouteNetwork";

// Illustrative only — labelled as an example in the UI.
const EXAMPLES = [
  { id: "2048", coin: "$CAT", to: "+1 ••• ••• 0123", collected: "0.412 AAPLx", usdc: "94.12", wallet: "7xKX…q2Fa" },
  { id: "2049", coin: "$ORBIT", to: "+234 ••• ••• 7710", collected: "1.087 AAPLx", usdc: "248.30", wallet: "Fh3p…9KdW" },
  { id: "2050", coin: "$AAPLX", to: "+1 ••• ••• 4266", collected: "0.096 AAPLx", usdc: "21.94", wallet: "B2nQ…uT7c" },
];
const CYCLE_MS = 4200;

function PayoutReadout() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % EXAMPLES.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [reduce]);
  const p = EXAMPLES[i];

  return (
    <div className="glass glass-refract readout w-[300px] overflow-hidden rounded-[20px]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-fg-2">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
          PAYOUT #{p.id}
        </span>
        <span className="text-[10.5px] text-fg-3">EXAMPLE</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={p.id}
          initial={{ opacity: 0, filter: "blur(6px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.35 }}
        >
          {[
            ["Coin", p.coin],
            ["Routed to", p.to],
            ["Collected", p.collected],
            ["Converted", `${p.usdc} USDC`],
            ["Wallet", p.wallet],
          ].map(([k, v]) => (
            <div key={k} className="readout-row px-4 py-2.5">
              <span>{k}</span>
              <span className="text-fg">{v}</span>
            </div>
          ))}
          <div className="readout-row px-4 py-2.5">
            <span>Status</span>
            <span className="text-accent">settled · owner&apos;s wallet</span>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="h-[2px] bg-white/5">
        <motion.div
          key={p.id}
          className="h-full bg-gradient-to-r from-accent to-accent-2 shadow-[0_0_10px_#7cf7e4]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: reduce ? 0 : CYCLE_MS / 1000, ease: "linear" }}
        />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative grid items-center gap-8 lg:min-h-[640px] lg:grid-cols-[1.05fr_1fr]">
      <div className="relative z-10">
        <Reveal y={8}>
          <span className="tag">
            <span className="text-accent">▲</span> pump.fun · paired with AAPLx · Solana
          </span>
        </Reveal>

        <h1 className="brackets mt-8 font-display text-[54px] font-semibold leading-[0.9] tracking-[-0.055em] sm:text-[76px] xl:text-[88px]">
          <Words text="Launch a coin." delay={0.08} step={0.05} />
          <br />
          <Words text="Name a number." delay={0.22} step={0.05} />
          <br />
          <span className="text-iris">
            <Words text="Fees find them." delay={0.36} step={0.05} />
          </span>
        </h1>

        <Reveal delay={0.55} y={12}>
          <p className="mt-8 max-w-[500px] text-[16.5px] leading-relaxed text-fg-2">
            Phobit routes every creator fee to <span className="text-fg">a phone number</span>. The owner verifies with a
            texted code and the money is already theirs — <span className="text-fg">in their own wallet</span>, converted
            to dollars.
          </p>
        </Reveal>

        <Reveal delay={0.65} y={10}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/launch" className="btn btn-primary h-12 px-6 text-[15px]">
              Launch a coin <Icons.Arrow width={16} height={16} />
            </Link>
            <Link href="/claim" className="btn btn-secondary h-12 px-6 text-[15px]">
              Claim your fees
            </Link>
          </div>
          <div className="mt-6 flex flex-col gap-2 text-[13px]">
            <Link href="/docs" className="group w-fit text-fg-2 underline decoration-accent/40 underline-offset-4 transition-colors hover:text-fg">
              How fees are routed and who holds them{" "}
              <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </Reveal>
      </div>

      <div className="relative">
        <RouteNetwork className="mx-auto w-full max-w-[640px]" />
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
          className="relative mx-auto -mt-10 w-fit lg:-mt-28 lg:mr-0"
        >
          <PayoutReadout />
        </motion.div>
      </div>
    </section>
  );
}
