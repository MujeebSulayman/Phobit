import { Icons } from "@/components/icons";

export const NAV = [
  { href: "/", label: "Home", icon: Icons.Home },
  { href: "/explore", label: "Explore", icon: Icons.Explore },
  { href: "/payouts", label: "Payouts", icon: Icons.Payments },
  { href: "/claim", label: "Claim fees", icon: Icons.Claim },
  { href: "/analytics", label: "Analytics", icon: Icons.Analytics },
  { href: "/launch", label: "Launch", icon: Icons.Launch },
  { href: "/docs", label: "Docs", icon: Icons.Docs },
];

export const MOBILE_NAV = [
  { href: "/", label: "Home", icon: Icons.Home },
  { href: "/explore", label: "Explore", icon: Icons.Explore },
  { href: "/launch", label: "Launch", icon: Icons.Launch },
  { href: "/claim", label: "Claim", icon: Icons.Claim },
  { href: "/payouts", label: "Payouts", icon: Icons.Payments },
];

export const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);
