"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { LogoMark } from "@/components/Logo";
import { EASE } from "@/components/motion";

const W = 640;
const H = 560;
const CX = 320;
const CY = 280;

type Node = { label: string; x: number; y: number; kind: "coin" | "phone"; dim?: boolean };

// Coins feed the vault from the left; masked numbers receive on the right.
const NODES: Node[] = [
  { label: "$CAT", x: 92, y: 118, kind: "coin" },
  { label: "$MOON", x: 54, y: 236, kind: "coin", dim: true },
  { label: "$ORBIT", x: 120, y: 352, kind: "coin" },
  { label: "$FROG", x: 70, y: 462, kind: "coin", dim: true },
  { label: "$LUMEN", x: 214, y: 70, kind: "coin", dim: true },
  { label: "$AAPLX", x: 236, y: 500, kind: "coin" },
  { label: "+1 ••• 0123", x: 520, y: 96, kind: "phone" },
  { label: "+44 ••• 8812", x: 590, y: 214, kind: "phone", dim: true },
  { label: "+1 ••• 4266", x: 566, y: 338, kind: "phone" },
  { label: "+234 ••• 7710", x: 500, y: 460, kind: "phone" },
  { label: "+61 ••• 3390", x: 410, y: 528, kind: "phone", dim: true },
];

/** A gentle curve from a node into the vault, bowed away from the straight line. */
function curve(n: Node) {
  const mx = (n.x + CX) / 2;
  const my = (n.y + CY) / 2;
  const dx = CX - n.x;
  const dy = CY - n.y;
  const bow = n.kind === "coin" ? 0.22 : -0.22;
  const qx = mx - dy * bow;
  const qy = my + dx * bow;
  return n.kind === "coin" ? `M ${n.x} ${n.y} Q ${qx} ${qy} ${CX} ${CY}` : `M ${CX} ${CY} Q ${qx} ${qy} ${n.x} ${n.y}`;
}

export function RouteNetwork({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 20 });

  return (
    <div
      ref={ref}
      className={`relative [perspective:1200px] ${className}`}
      onPointerMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry }} className="relative aspect-[640/560] w-full [transform-style:preserve-3d]">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <radialGradient id="vault-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#7cf7e4" stopOpacity="0.35" />
              <stop offset="1" stopColor="#7cf7e4" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wire-in" x1="0" x2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="1" stopColor="#7cf7e4" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="wire-out" x1="0" x2="1">
              <stop offset="0" stopColor="#a594ff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
            </linearGradient>
            <filter id="pulse-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Orbits */}
          <g transform={`rotate(-14 ${CX} ${CY})`}>
            {[96, 168, 244, 318].map((r, i) => (
              <motion.ellipse
                key={r}
                cx={CX}
                cy={CY}
                rx={r}
                ry={r * 0.6}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.09 - i * 0.015}
                strokeDasharray={i % 2 ? "2 6" : undefined}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.6, delay: 0.2 + i * 0.12, ease: EASE }}
              />
            ))}
          </g>
          <g className="spin-slow" style={{ ["--duration" as string]: "90s" }}>
            <ellipse cx={CX} cy={CY} rx={210} ry={210} fill="none" stroke="#7cf7e4" strokeOpacity="0.07" strokeDasharray="1 14" />
          </g>
          <circle cx={CX} cy={CY} r={120} fill="url(#vault-glow)" />

          {/* Wires */}
          {NODES.map((n, i) => (
            <motion.path
              key={n.label}
              d={curve(n)}
              fill="none"
              stroke={n.kind === "coin" ? "url(#wire-in)" : "url(#wire-out)"}
              strokeWidth={n.dim ? 0.8 : 1.1}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.5 + i * 0.07, ease: EASE }}
            />
          ))}

          {/* Pulses travelling coin → vault → number */}
          {!reduce &&
            NODES.filter((n) => !n.dim).map((n, i) => (
              <circle key={`p-${n.label}`} r={2.6} opacity={0} fill={n.kind === "coin" ? "#7cf7e4" : "#c9bdff"} filter="url(#pulse-glow)">
                <animateMotion dur={`${2.6 + (i % 3) * 0.6}s`} begin={`${1.6 + i * 0.45}s`} repeatCount="indefinite" path={curve(n)} />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur={`${2.6 + (i % 3) * 0.6}s`} begin={`${1.6 + i * 0.45}s`} repeatCount="indefinite" />
              </circle>
            ))}

          {/* Node markers + labels */}
          {NODES.map((n, i) => {
            const left = n.kind === "coin";
            return (
              <motion.g
                key={`n-${n.label}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: n.dim ? 0.45 : 1 }}
                transition={{ duration: 0.6, delay: 1 + i * 0.06 }}
              >
                <rect
                  x={n.x - 3.5}
                  y={n.y - 3.5}
                  width={7}
                  height={7}
                  fill={n.kind === "coin" ? "#05060a" : "#a594ff"}
                  stroke={n.kind === "coin" ? "#7cf7e4" : "#c9bdff"}
                  strokeWidth={1}
                />
                <text
                  x={left ? n.x - 10 : n.x + 10}
                  y={n.y + 3.5}
                  textAnchor={left ? "end" : "start"}
                  fontFamily="var(--font-geist-mono), ui-monospace, monospace"
                  fontSize="11"
                  letterSpacing="0.06em"
                  fill={n.kind === "coin" ? "#cfe9e5" : "#d8d1ff"}
                >
                  {n.label}
                </text>
              </motion.g>
            );
          })}
        </svg>

        {/* Vault: a liquid-glass tile at the centre, floating above the wires */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0, filter: "blur(10px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [transform:translateZ(40px)]"
        >
          <motion.div
            animate={reduce ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2"
          >
            <div className="glass glass-refract grid h-[74px] w-[74px] place-items-center rounded-[22px]">
              <LogoMark size={40} />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-2">Vault</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
