"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV, isActive } from "./nav";

/** Floating liquid-glass dock for small screens. */
export function MobileDock() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-3 z-40 lg:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="glass glass-refract mx-auto flex max-w-md items-center justify-between rounded-[28px] p-1.5">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const on = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-[22px] py-2 text-[10.5px] cursor-pointer ${on ? "text-fg" : "text-fg-3"}`}
            >
              {on && (
                <motion.span
                  layoutId="dock-bubble"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-[22px] border border-white/15 bg-gradient-to-b from-white/[0.16] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                />
              )}
              <Icon width={19} height={19} className="relative" />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
