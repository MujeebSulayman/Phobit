"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/lib/useWallet";

export function Topbar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { connected, address, connect, account } = useWallet();

  // ⌘K / Ctrl+K or "/" focuses search, Esc clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-2xl lg:px-10">
      <Link href="/" className="flex items-center gap-2 lg:hidden cursor-pointer">
        <Logo size={30} />
      </Link>

      <form
        className="mx-auto w-full max-w-[460px]"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
        }}
      >
        <label className="relative block">
          <span
            className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
              focused ? "text-fg" : "text-fg-3"
            }`}
          >
            <Icons.Search width={15} height={15} />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search coins, tickers, wallets"
            aria-label="Search"
            className="input h-10 rounded-full pl-10 pr-16 text-sm"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <kbd className="kbd">{query ? "↵" : focused ? "esc" : "⌘K"}</kbd>
          </span>
        </label>
      </form>

      <div className="flex items-center gap-2">
        <Link href="/launch" className="btn btn-primary hidden h-9 px-4 sm:inline-flex">
          Launch coin
        </Link>
        <button onClick={connected ? account : connect} className="btn btn-secondary h-9 px-4">
          {connected ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green" />
              <span className="font-mono">{shortAddress(address!)}</span>
            </>
          ) : (
            <>
              <Icons.Wallet width={15} height={15} /> Connect wallet
            </>
          )}
        </button>
      </div>
    </header>
  );
}
