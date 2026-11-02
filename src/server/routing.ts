import "server-only";
import { cardProvider } from "./cards";
import { sql, type PayoutRow } from "./db";
import { activeCard } from "./queries";

/**
 * Sends swapped / waiting payouts to the recipient's active card, or parks them as "unrouted".
 * Safe to re-run: the payout id is the provider's idempotency key.
 */
export async function routePayouts(recipientKey?: string) {
  const key = recipientKey ?? null;
  const payouts = await sql<PayoutRow>`
    select * from payouts
    where status in ('swapped', 'unrouted') and (${key}::text is null or recipient_key = ${key})
    order by created_at
    limit 200`;
  const provider = cardProvider();
  const cards = new Map<string, Awaited<ReturnType<typeof activeCard>>>();

  for (const p of payouts) {
    if (!cards.has(p.recipient_key)) cards.set(p.recipient_key, await activeCard(p.recipient_key));
    const card = cards.get(p.recipient_key);
    if (!card) {
      if (p.status !== "unrouted") await sql`update payouts set status = 'unrouted', updated_at = now() where id = ${p.id}`;
      continue;
    }
    try {
      const transferId = await provider.fundCard({
        providerCardId: card.provider_card_id,
        usdcAmount: Number(p.usdc_amount ?? 0),
        idempotencyKey: p.id,
      });
      await sql`
        update payouts
        set status = 'submitted', card_id = ${card.id}, transfer_id = ${transferId}, failure_reason = null, updated_at = now()
        where id = ${p.id}`;
    } catch (e) {
      console.error(`[routing] funding payout ${p.id} failed`, e);
    }
  }
}

/** Polls the card provider for submitted payouts and marks them paid or failed. */
export async function settlePayouts() {
  const payouts = await sql<PayoutRow>`select * from payouts where status = 'submitted' order by created_at limit 200`;
  const provider = cardProvider();
  for (const p of payouts) {
    if (!p.transfer_id) continue;
    const s = await provider.transferStatus(p.transfer_id);
    if (s.state === "pending") continue;
    await sql`
      update payouts
      set status = ${s.state}, failure_reason = ${s.state === "failed" ? s.reason : null}, updated_at = now()
      where id = ${p.id}`;
  }
}
