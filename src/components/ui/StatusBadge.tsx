import type { PayoutStatus } from "@/lib/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  swept: { label: "Swept", cls: "text-fg-2 border-line" },
  swapped: { label: "Converted to USDC", cls: "text-blue border-blue/30" },
  unrouted: { label: "Awaiting card", cls: "text-amber border-amber/30" },
  submitted: { label: "Bridging to card", cls: "text-blue border-blue/30" },
  paid: { label: "Settled", cls: "text-green border-green/30" },
  failed: { label: "Failed", cls: "text-red border-red/30" },
};

export function StatusBadge({ status }: { status: PayoutStatus | string }) {
  const s = STATUS[status] ?? STATUS.swept;
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-[11px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
