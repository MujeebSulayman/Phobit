import Link from "next/link";
import type { ReactNode } from "react";
import { Icons } from "@/components/icons";

/** Home-page tile: content area plus an "Open →" footer, linking to a section of the app. */
export function BentoCard({
  href,
  label,
  className = "",
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`card card-hover group flex flex-col overflow-hidden cursor-pointer ${className}`}>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <div className="flex shrink-0 items-center justify-between border-t border-dashed border-white/[0.08] px-5 py-3.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-2 transition-colors group-hover:text-fg">{label}</span>
        <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-3 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-accent">
          Open <Icons.Arrow width={13} height={13} />
        </span>
      </div>
    </Link>
  );
}
