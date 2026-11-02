"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children?: ReactNode;
  delay?: number;
  y?: number;
  inView?: boolean;
};

export function Reveal({ children, delay = 0, y = 18, inView = false, className, ...rest }: RevealProps) {
  const visible = { opacity: 1, y: 0, filter: "blur(0px)" };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      {...(inView ? { whileInView: visible, viewport: { once: true, margin: "-80px" } } : { animate: visible })}
      transition={{ duration: 0.55, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Words({
  text,
  delay = 0,
  step = 0.035,
  className,
}: {
  text: string;
  delay?: number;
  step?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: delay + i * step, ease: EASE }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 && <span> </span>}
        </span>
      ))}
    </span>
  );
}
