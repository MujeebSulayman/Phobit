"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV, isActive } from "./nav";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] cursor-pointer ${
            isActive(href, pathname) ? "text-fg" : "text-fg-3"
          }`}
        >
          <Icon width={20} height={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
