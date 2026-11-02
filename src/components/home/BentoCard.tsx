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
      <div className="flex shrink-0 items-center justify-between border-t border-line px-5 py-3.5 text-[13px]">
        <span className="font-medium text-fg-2 transition-colors group-hover:text-fg">{label}</span>
        <span className="flex items-center gap-1 text-fg-3 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-fg">
          Open <Icons.Arrow width={14} height={14} />
        </span>
      </div>
    </Link>
  );
}
