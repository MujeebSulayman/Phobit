"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE } from "@/components/motion";

/** Page title block: mono section tag, display title with corner brackets, subtitle. */
export function PageHeader({
  title,
  subtitle,
  right,
  tag,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  tag?: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div>
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="tag"
        >
          <span className="h-1.5 w-1.5 bg-accent shadow-[0_0_8px_#7cf7e4]" />
          {tag ?? (typeof title === "string" ? title : "Phobit")}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
          className="brackets mt-5 font-display text-[40px] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[52px]"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
            className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-fg-2"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {right}
    </div>
  );
}
