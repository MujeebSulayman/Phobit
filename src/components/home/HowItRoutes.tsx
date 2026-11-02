"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/motion";

const STEPS = [
  ["Launch", "Name the coin and type a phone number. That number's wallet becomes the coin's creator on pump.fun."],
  ["Trade", "Every buy and sell pays a 3% creator fee in AAPLx into a vault only that wallet controls."],
  ["Verify", "The owner signs in with the number and a texted code. The wallet — and everything in it — is theirs."],
  ["Get paid", "Fees are collected and converted to USDC inside their wallet. Withdraw anywhere, or spend by card."],
];

/** Four-step route with a light pulse running along the connecting rail. */
export function HowItRoutes() {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag">
            <span className="h-1.5 w-1.5 bg-accent-2" /> The route
          </span>
          <h2 className="mt-5 font-display text-[36px] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[48px]">
            One signature to launch.
            <br />
            <span className="text-fg-3">Zero to get paid.</span>
          </h2>
        </div>
        <p className="max-w-sm text-[14.5px] leading-relaxed text-fg-2">
          No escrow, no custody, no app to install. A phone number is the whole account.
        </p>
      </div>

      <div className="relative mt-12">
        {/* Rail + travelling light */}
        <div className="absolute left-0 right-0 top-[27px] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block">
          <motion.div
            className="absolute top-1/2 h-[3px] w-24 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent blur-[1px]"
            animate={{ left: ["-10%", "105%"] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
          />
        </div>
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
            >
              <div className="glass glass-refract mb-4 grid h-14 w-14 place-items-center rounded-2xl font-mono text-[13px] text-accent">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="card card-hover h-[calc(100%-4.5rem)] p-5">
                <h3 className="font-display text-[20px] font-semibold tracking-[-0.03em]">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">{body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
