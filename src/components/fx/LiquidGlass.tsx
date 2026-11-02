"use client";

import { useEffect } from "react";

/**
 * Liquid-glass plumbing, mounted once:
 * - the SVG displacement filter used for real refraction (Chromium renders SVG filters in
 *   backdrop-filter; other browsers keep the frosted fallback),
 * - pointer tracking that feeds --mx/--my to the glass surface under the cursor, so its
 *   specular highlight and rim follow the light.
 */
export function LiquidGlass() {
  useEffect(() => {
    const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
    if (brands?.some((b) => b.brand === "Chromium")) document.documentElement.classList.add("lg-refract");

    let frame = 0;
    let last: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = (e.target as Element | null)?.closest?.<HTMLElement>(".glass, .card");
        if (last && last !== el) last.style.removeProperty("--glare");
        last = el ?? null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <filter id="phobit-liquid" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2.5" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="38" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
