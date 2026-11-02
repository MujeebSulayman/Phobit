import { useId } from "react";

/** Phobit mark: a lit orb on a tilted orbit with one node — fees routed to a person. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <defs>
        <radialGradient id={`orb-${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#9ff6ea" />
          <stop offset="0.75" stopColor="#6a8dff" />
          <stop offset="1" stopColor="#8a6cff" />
        </radialGradient>
        <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7cf7e4" />
          <stop offset="1" stopColor="#a594ff" />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="16" rx="14" ry="6.2" transform="rotate(-28 16 16)" stroke={`url(#ring-${id})`} strokeWidth="1.4" opacity="0.9" />
      <circle cx="16" cy="16" r="7.2" fill={`url(#orb-${id})`} />
      <circle cx="13.6" cy="13.4" r="2.2" fill="#fff" opacity="0.55" />
      <circle cx="27.4" cy="9.6" r="2.3" fill="#eafffb" stroke="#05060a" strokeWidth="1" />
    </svg>
  );
}

/** Mark + "phobit" wordmark. `size` is the mark size; the wordmark scales with it. */
export function Logo({ size = 28, wordmark = true, className = "" }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="font-display font-semibold tracking-[-0.04em] text-fg" style={{ fontSize: size * 0.72, lineHeight: 1 }}>
          phobit
        </span>
      )}
    </span>
  );
}
