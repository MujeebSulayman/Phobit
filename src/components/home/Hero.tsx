"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { EASE, Reveal, Words } from "@/components/motion";

export function Hero() {
  return (
    <section className="relative mx-auto max-w-3xl pt-6 pb-4 text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/3 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.07), transparent 70%)" }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: EASE }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85, filter: "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mx-auto mb-7 w-fit"
      >
        <Logo size={56} className="shadow-[0_20px_50px_-20px_rgba(255,255,255,0.35)]" />
      </motion.div>
      <h1 className="text-[46px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[64px]">
        <Words text="Creator fees," delay={0.05} />
        <br />
        <Words text="straight to Apple Pay." delay={0.12} />
      </h1>
      <Reveal delay={0.28} y={12}>
        <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-relaxed text-fg-2">
          Launch a coin on pump.fun and send its creator fees to anyone&apos;s Apple Pay — just their phone number. They
          verify once, pick a card, and every trade pays them in dollars.
        </p>
      </Reveal>
      <Reveal delay={0.36} y={10}>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link href="/launch" className="btn btn-primary h-11 px-6 text-[15px]">
            Launch coin
          </Link>
          <Link href="/docs" className="btn btn-secondary h-11 px-6 text-[15px]">
            Docs
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
