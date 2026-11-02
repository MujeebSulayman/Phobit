/** base64 → bytes */
export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** bytes → base64 */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function formatSol(lamports: number | bigint, maxDigits = 4): string {
  const sol = Number(lamports) / 1e9;
  return `${sol.toLocaleString("en-US", { maximumFractionDigits: maxDigits })} SOL`;
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatUsdCompact(usd: number): string {
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(usd >= 1e5 ? 0 : 1)}K`;
  return `$${usd.toFixed(usd >= 100 ? 0 : 2)}`;
}

export function shortAddress(addr: string, chars = 4): string {
  return addr.length <= 2 * chars + 1 ? addr : `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "";

/** Rewrites ipfs.io / pinata URLs to the dedicated gateway with a square resize. */
export function ipfsImage(url: string | null | undefined, size: number): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!PINATA_GATEWAY || (u.hostname !== "ipfs.io" && u.hostname !== PINATA_GATEWAY)) return url;
    const out = new URL(`https://${PINATA_GATEWAY}${u.pathname}`);
    out.searchParams.set("img-width", String(size));
    out.searchParams.set("img-height", String(size));
    out.searchParams.set("img-fit", "cover");
    return out.toString();
  } catch {
    return url;
  }
}

/** "12s", "4m", "3h", "2d" */
export function timeAgo(date: string | number | Date): string {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
