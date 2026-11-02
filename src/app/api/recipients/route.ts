import { requireRecipient } from "@/server/auth";
import { cardProvider } from "@/server/cards";
import { sql } from "@/server/db";
import { json, route } from "@/server/http";
import { activeCard, dashboard } from "@/server/queries";
import { syncRecipient } from "@/server/wallet";

export const dynamic = "force-dynamic";

/** The signed-in recipient's wallet, card, coins routing to them, totals by stage and payouts. */
export const GET = route(async (req) => {
  const me = await requireRecipient(req);
  await syncRecipient(me);
  return json(await dashboard(me), { private: true });
});

/** Removes the active card. Later payouts stay as USDC in the wallet ("unrouted") until a new card exists. */
export const DELETE = route(async (req) => {
  const me = await requireRecipient(req);
  const card = await activeCard(me.key);
  if (card) {
    await cardProvider().closeCard(card.provider_card_id);
    await sql`update cards set status = 'closed', closed_at = now() where id = ${card.id}`;
  }
  await sql`update recipients set status = 'pending' where key = ${me.key}`;
  return json({ ok: true }, { private: true });
});
