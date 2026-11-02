import { requireRecipient } from "@/server/auth";
import { cardProvider } from "@/server/cards";
import { encrypt } from "@/server/crypto";
import { isUniqueViolation, sql } from "@/server/db";
import { json, readJson, route } from "@/server/http";
import { activeCard } from "@/server/queries";
import { routePayouts } from "@/server/routing";
import { syncRecipient } from "@/server/wallet";

export const dynamic = "force-dynamic";

/** Issues the recipient's virtual card (idempotent) and releases payouts waiting for it. */
export const POST = route(async (req) => {
  const me = await requireRecipient(req);
  await syncRecipient(me);
  if (!(await activeCard(me.key))) {
    const provider = cardProvider();
    const card = await provider.issueCard({ recipientKey: me.key, contact: me.contact });
    try {
      await sql`
        insert into cards (recipient_key, provider, provider_card_id, last4, exp, pan_enc, cvv_enc)
        values (${me.key}, ${provider.name}, ${card.providerCardId}, ${card.pan.slice(-4)}, ${card.exp},
                ${encrypt(card.pan)}, ${encrypt(card.cvv)})`;
    } catch (e) {
      // A concurrent request won the unique "one active card" index: close the duplicate at the issuer.
      await provider.closeCard(card.providerCardId);
      if (!isUniqueViolation(e)) throw e;
    }
  }

  await sql`update recipients set status = 'active' where key = ${me.key}`;
  // Failed payouts get another try on the new card, along with everything that was waiting.
  await sql`update payouts set status = 'unrouted', updated_at = now() where recipient_key = ${me.key} and status = 'failed'`;
  await routePayouts(me.key);
  return json({ ok: true }, { private: true });
});

/** Records that the card was added to a phone wallet. */
export const PATCH = route(async (req) => {
  const me = await requireRecipient(req);
  const body = await readJson<{ walletAdded?: boolean }>(req);
  const card = await activeCard(me.key);
  if (card && body.walletAdded)
    await sql`update cards set wallet_added_at = now() where id = ${card.id}`;
  return json({ ok: true }, { private: true });
});
