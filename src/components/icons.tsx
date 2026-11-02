import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = (props: IconProps): IconProps => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props,
});

export const Icons = {
  Home: (p: IconProps) => (
    <svg {...stroke(p)}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  ),
  Explore: (p: IconProps) => (
    <svg {...stroke(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 6-4 2 2-6z" />
    </svg>
  ),
  Payments: (p: IconProps) => (
    <svg {...stroke(p)}>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  ),
  Claim: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="M12 4v11" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  ),
  Analytics: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 14 4-4 3 3 5-6" />
    </svg>
  ),
  Launch: (p: IconProps) => (
    <svg {...stroke(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  ),
  Docs: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  ),
  Search: (p: IconProps) => (
    <svg {...stroke(p)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  ),
  Arrow: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  ),
  Wallet: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2H3z" />
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <circle cx="16" cy="13" r="1" />
    </svg>
  ),
  Apple: (p: IconProps) => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M16.37 12.73c.03 2.86 2.5 3.81 2.53 3.82-.02.07-.4 1.36-1.3 2.7-.79 1.15-1.6 2.3-2.89 2.32-1.26.02-1.67-.75-3.12-.75-1.44 0-1.9.73-3.09.77-1.24.05-2.19-1.25-2.98-2.4C3.9 16.84 2.67 12.55 4.33 9.7c.82-1.42 2.3-2.32 3.9-2.34 1.22-.02 2.37.82 3.12.82.74 0 2.14-1.01 3.6-.86.61.03 2.34.25 3.44 1.86-.09.06-2.05 1.2-2.02 3.55zM14 5.85c.66-.8 1.1-1.9.98-3.01-.95.04-2.1.63-2.78 1.43-.61.7-1.14 1.83-1 2.9 1.06.08 2.14-.54 2.8-1.32z" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Collapse: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  ),
  External: (p: IconProps) => (
    <svg {...stroke(p)}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
    </svg>
  ),
};
