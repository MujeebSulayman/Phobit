"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { NAV, isActive } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[240px] flex-col border-r border-line bg-bg px-4 py-5">
      <Link
        href="/"
        className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-card cursor-pointer"
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-gradient-to-b from-[#1c1c20] to-[#09090a] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_20px_-10px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition-shadow group-hover:ring-white/20">
          <Logo size={40} className="rounded-none transition-transform duration-500 group-hover:scale-105" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent"
          />
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-[16px] font-semibold tracking-[-0.02em]">Debit</span>
          <span className="mt-1 text-[11px] text-fg-3">Fees → Apple Pay</span>
        </span>
      </Link>

      <nav className="mt-7 flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors cursor-pointer ${
                active ? "text-fg font-medium" : "text-fg-2 hover:text-fg"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-card-2"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <Icon />
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <a
        href="https://x.com/usedebit"
        target="_blank"
        rel="noreferrer"
        className="group mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] text-fg-2 transition-colors hover:bg-card hover:text-fg cursor-pointer"
      >
        <Icons.X width={18} height={18} className="text-fg" />
        <span className="font-medium">usedebit</span>
        <Icons.Arrow
          width={14}
          height={14}
          className="ml-auto -rotate-45 text-fg-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </a>
    </aside>
  );
}
