import "server-only";
import { cardProvider } from "./cards";
import { db, must, type PayoutRow } from "./db";
import { activeCard } from "./queries";

const now = () => new Date().toISOString();

/**
 * Sends swapped / waiting payouts to the recipient's active card, or parks them as "unrouted"
 * (the USDC stays in their own wallet either way). Safe to re-run: the payout id is the provider's
 * idempotency key.
 */
export async function routePayouts(recipientKey?: string) {
  let q = db().from("payouts").select("*").in("status", ["swapped", "unrouted"]).order("created_at").limit(200);
  if (recipientKey) q = q.eq("recipient_key", recipientKey);
  const payouts = must(await q) as PayoutRow[];
  const provider = cardProvider();
  const cards = new Map<string, Awaited<ReturnType<typeof activeCard>>>();

  for (const p of payouts) {
    if (!cards.has(p.recipient_key)) cards.set(p.recipient_key, await activeCard(p.recipient_key));
    const card = cards.get(p.recipient_key);
    if (!card) {
      if (p.status !== "unrouted")
        must(await db().from("payouts").update({ status: "unrouted", updated_at: now() }).eq("id", p.id));
      continue;
    }
    try {
      const transferId = await provider.fundCard({
        providerCardId: card.provider_card_id,
        usdcAmount: Number(p.usdc_amount ?? 0),
        idempotencyKey: p.id,
      });
      must(
        await db()
          .from("payouts")
          .update({ status: "submitted", card_id: card.id, transfer_id: transferId, failure_reason: null, updated_at: now() })
          .eq("id", p.id),
      );
    } catch (e) {
      console.error(`[routing] funding payout ${p.id} failed`, e);
    }
  }
}

/** Polls the card provider for submitted payouts and marks them paid or failed. */
export async function settlePayouts() {
  const payouts = must(await db().from("payouts").select("*").eq("status", "submitted").limit(200)) as PayoutRow[];
  const provider = cardProvider();
  for (const p of payouts) {
    if (!p.transfer_id) continue;
    const s = await provider.transferStatus(p.transfer_id);
    if (s.state === "pending") continue;
    must(
      await db()
        .from("payouts")
        .update({ status: s.state, failure_reason: s.state === "failed" ? s.reason : null, updated_at: now() })
        .eq("id", p.id),
    );
  }
}
