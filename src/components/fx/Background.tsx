"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")";

/**
 * The fixed field behind every page: near-black base, a fine grid that fades toward the edges,
 * slow-drifting aqua/violet light, and film grain. Purely decorative.
 */
export function Background() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const drift = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const driftSlow = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const float = (x: number[], y: number[], duration: number) =>
    reduce ? {} : { animate: { x, y }, transition: { duration, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" as const } };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      {/* Light */}
      <motion.div style={{ y: drift }} className="absolute inset-0">
        <motion.div
          {...float([0, -60, 30], [0, 40, -20], 26)}
          className="absolute -right-[12%] -top-[22%] h-[78vh] w-[70vw] rounded-full opacity-[0.55] blur-[90px]"
          style={{ background: "radial-gradient(closest-side, #19b9a7 0%, #0f6f72 45%, transparent 75%)" }}
        />
        <motion.div
          {...float([0, 50, -30], [0, -30, 30], 32)}
          className="absolute -left-[18%] top-[28%] h-[70vh] w-[60vw] rounded-full opacity-40 blur-[110px]"
          style={{ background: "radial-gradient(closest-side, #5b3fd6 0%, #2b1f74 50%, transparent 78%)" }}
        />
      </motion.div>
      <motion.div style={{ y: driftSlow }} className="absolute inset-0">
        <motion.div
          {...float([0, -40, 20], [0, 20, -10], 22)}
          className="absolute bottom-[-30%] right-[10%] h-[60vh] w-[50vw] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, #1f7bb8 0%, transparent 72%)" }}
        />
      </motion.div>

      {/* Grid, fading out from the top-centre */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff0d 1px, transparent 1px), linear-gradient(to bottom, #ffffff0d 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          backgroundPosition: "center top",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 60% 10%, #000 20%, transparent 75%)",
          maskImage: "radial-gradient(ellipse 90% 70% at 60% 10%, #000 20%, transparent 75%)",
        }}
      />
      {/* Fine sub-grid near the light */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff08 1px, transparent 1px), linear-gradient(to bottom, #ffffff08 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          WebkitMaskImage: "radial-gradient(ellipse 40% 35% at 78% 8%, #000, transparent 70%)",
          maskImage: "radial-gradient(ellipse 40% 35% at 78% 8%, #000, transparent 70%)",
        }}
      />
      {/* Grain + vignette */}
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 120% 90% at 50% 0%, transparent 55%, #05060ae6 100%)" }} />
    </div>
  );
}
