import Link from "next/link";
import { Logo } from "@/components/Logo";

const STATUS = [
  ["Network", "Solana mainnet"],
  ["Launchpad", "pump.fun"],
  ["Quote", "AAPLx"],
  ["Creator fee", "3%"],
  ["Settlement", "USDC"],
  ["Custody", "none · recipient-owned wallets"],
];

/** Monospace status strip + footer links. */
export function Footer() {
  const strip = [...STATUS, ...STATUS];
  return (
    <footer className="relative mt-24 border-t border-white/[0.07]">
      <div className="fade-x overflow-hidden border-b border-white/[0.06] py-3">
        <div className="marquee-row flex w-max gap-10 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-3" style={{ ["--duration" as string]: "48s" }}>
          {strip.map(([k, v], i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-accent/80 shadow-[0_0_6px_#7cf7e4]" />
              {k} <span className="text-fg-2">· {v}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-10 pb-32 sm:flex-row sm:items-center sm:justify-between lg:px-10 lg:pb-10">
        <div>
          <Logo size={24} />
          <p className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-fg-3">
            Launch a coin, name a phone number. Creator fees land in that person&apos;s own wallet.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-3">
          {[
            ["/launch", "Launch"],
            ["/claim", "Claim"],
            ["/explore", "Explore"],
            ["/payouts", "Payouts"],
            ["/analytics", "Analytics"],
            ["/docs", "Docs"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="transition-colors hover:text-fg cursor-pointer">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
