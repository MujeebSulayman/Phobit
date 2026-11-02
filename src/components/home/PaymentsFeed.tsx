"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCents, timeAgo } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

const PREVIEW: FeedItem[] = [
  { id: "p1", coin: "Debit Coin", recipient: "+1 ••• ••• 0199", usdCents: 1842, status: "submitted", createdAt: "" },
  { id: "p2", coin: "Orbit", recipient: "+1 ••• ••• 8831", usdCents: 627, status: "paid", createdAt: "" },
  { id: "p3", coin: "Moonbean", recipient: "+44 ••• ••• 7731", usdCents: 9310, status: "submitted", createdAt: "" },
  { id: "p4", coin: "Glass", recipient: "+91 ••• ••• 6102", usdCents: 211, status: "unrouted", createdAt: "" },
  { id: "p5", coin: "Satori", recipient: "+1 ••• ••• 4420", usdCents: 4455, status: "paid", createdAt: "" },
];

export function PaymentsFeed({ items }: { items: FeedItem[] }) {
  const live = items.length > 0;
  const [offset, setOffset] = useState(0);

  // With no real sweeps yet, cycle through preview rows.
  useEffect(() => {
    if (live) return;
    const id = setInterval(() => setOffset((o) => (o + 1) % PREVIEW.length), 2600);
    return () => clearInterval(id);
  }, [live]);

  const rows = live ? items.slice(0, 3) : [0, 1, 2].map((i) => PREVIEW[(offset + i) % PREVIEW.length]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="eyebrow">{live ? "Latest sweeps" : "Preview"}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-fg-3">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-green" /> Keeper active
        </span>
      </div>
      <div className="relative flex flex-1 flex-col gap-2 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.98 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-bg-elev px-3.5 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card-2 text-fg-2">
                <Icons.Payments width={16} height={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">
                  Fees <span className="text-fg-3">·</span> {item.coin}
                </div>
                <div className="flex items-center gap-1 truncate text-[12px] text-fg-3">
                  <Icons.Apple width={11} height={11} /> {item.recipient}
                  {item.createdAt && <> · {timeAgo(item.createdAt)}</>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[13px] tabular-nums">{formatCents(item.usdCents)}</span>
                <StatusBadge status={item.status} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
