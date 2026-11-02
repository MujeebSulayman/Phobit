"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { LogoMark } from "@/components/Logo";

/** A liquid-glass virtual card that tilts toward the pointer, with a moving iridescent sheen. */
export function PhobitCard() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-14, 14]), { stiffness: 150, damping: 18 });
  const rotateX = useSpring(useTransform(py, [0, 1], [10, -10]), { stiffness: 150, damping: 18 });
  const shineX = useTransform(px, [0, 1], ["0%", "100%"]);
  const shineY = useTransform(py, [0, 1], ["0%", "100%"]);

  return (
    <div className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Fees route to</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-3">Virtual · USDC</span>
      </div>
      <div
        className="flex flex-1 items-center py-3"
        style={{ perspective: 900 }}
        onPointerMove={(e) => {
          if (reduce) return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          animate={reduce ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="glass relative aspect-[1.586] w-full overflow-hidden rounded-[20px]"
        >
          {/* Liquid colour field */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(80% 90% at 15% 10%, #7cf7e455, transparent 60%), radial-gradient(70% 80% at 95% 100%, #a594ff55, transparent 60%), linear-gradient(135deg, #0c1219, #0a0b14)",
            }}
          />
          {/* Pointer sheen */}
          <motion.div
            aria-hidden
            className="absolute inset-0 mix-blend-screen"
            style={{
              background: useTransform(
                [shineX, shineY] as never,
                ([x, y]: string[]) => `radial-gradient(240px circle at ${x} ${y}, #ffffff38, transparent 55%)`,
              ),
            }}
          />
          <div className="relative flex h-full flex-col justify-between p-[7%]">
            <div className="flex items-start justify-between">
              <LogoMark size={30} />
              <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-fg-2">
                Phobit
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div className="font-mono text-[clamp(12px,3.6cqw,15px)] tracking-[0.2em] text-fg">
                <span className="text-fg-3">•••• ••••</span> 4242
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-accent">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" /> Live
              </span>
            </div>
          </div>
        </motion.div>
      </div>
      <p className="text-[12.5px] leading-snug text-fg-3">Verify the number once. Every payout lands in your wallet as USDC.</p>
    </div>
  );
}
