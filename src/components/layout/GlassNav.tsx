"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { EASE } from "@/components/motion";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/lib/useWallet";
import { NAV, isActive } from "./nav";

/** Floating liquid-glass navigation. Tightens as you scroll; ⌘K / "/" opens search. */
export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { connected, address, connect, account } = useWallet();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearching(true);
      } else if (e.key === "Escape") setSearching(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searching) requestAnimationFrame(() => inputRef.current?.focus());
  }, [searching]);

  const active = NAV.find((n) => isActive(n.href, pathname))?.href ?? null;

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:pt-4"
      >
        <motion.nav
          animate={{ maxWidth: scrolled ? 1040 : 1240 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="glass glass-refract flex h-14 w-full items-center gap-2 rounded-full pl-4 pr-2"
        >
          <Link href="/" className="flex shrink-0 items-center rounded-full pr-2 cursor-pointer" aria-label="Phobit home">
            <Logo size={26} />
          </Link>

          <div className="relative ml-2 hidden items-center lg:flex" onMouseLeave={() => setHovered(null)}>
            {NAV.map(({ href, label }) => {
              const on = (hovered ?? active) === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onMouseEnter={() => setHovered(href)}
                  className={`relative h-9 rounded-full px-3.5 text-[13.5px] leading-9 transition-colors cursor-pointer ${
                    active === href ? "text-fg" : "text-fg-2 hover:text-fg"
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="nav-bubble"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-full border border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                    />
                  )}
                  <span className="relative">{label}</span>
                  {active === href && (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute -bottom-0.5 left-1/2 h-[3px] w-3 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_8px_#7cf7e4]"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSearching(true)}
              className="hidden h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] pl-3 pr-1.5 text-[12.5px] text-fg-3 transition-colors hover:border-white/20 hover:text-fg-2 md:flex cursor-pointer"
            >
              <Icons.Search width={14} height={14} />
              Search
              <kbd className="kbd">⌘K</kbd>
            </button>
            <button onClick={connected ? account : connect} className="btn btn-secondary h-10 px-4 text-[13px]">
              {connected ? (
                <>
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="font-mono text-[12px]">{shortAddress(address!)}</span>
                </>
              ) : (
                <>
                  <Icons.Wallet width={14} height={14} />
                  <span className="hidden sm:inline">Connect</span>
                </>
              )}
            </button>
            <Link href="/launch" className="btn btn-primary hidden h-10 px-4 text-[13px] sm:inline-flex">
              Launch <Icons.Arrow width={14} height={14} />
            </Link>
          </div>
        </motion.nav>
      </motion.header>

      <AnimatePresence>
        {searching && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[18vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearching(false)}
          >
            <motion.form
              initial={{ y: -16, scale: 0.96, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -10, scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                if (!query.trim()) return;
                router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
                setSearching(false);
                setQuery("");
              }}
              className="glass glass-refract w-full max-w-xl rounded-[26px] p-2"
            >
              <label className="flex items-center gap-3 px-3">
                <Icons.Search width={18} height={18} className="text-fg-3" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search coins, tickers, wallets"
                  aria-label="Search"
                  className="h-12 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-3"
                />
                <kbd className="kbd">{query ? "↵" : "esc"}</kbd>
              </label>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
