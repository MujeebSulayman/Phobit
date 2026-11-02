import { requireRecipient } from "@/server/auth";
import { cardProvider } from "@/server/cards";
import { encrypt } from "@/server/crypto";
import { db, isUniqueViolation, must } from "@/server/db";
import { json, readJson, route } from "@/server/http";
import { activeCard } from "@/server/queries";
import { routePayouts } from "@/server/routing";
import { syncRecipient } from "@/server/wallet";

export const dynamic = "force-dynamic";

/** Issues the recipient's virtual card (idempotent) and releases payouts waiting for it. */
export const POST = route(async (req) => {
  const me = await requireRecipient(req);
  await syncRecipient(me);
  const now = new Date().toISOString();

  if (!(await activeCard(me.key))) {
    const provider = cardProvider();
    const card = await provider.issueCard({ recipientKey: me.key, contact: me.contact });
    const { error } = await db().from("cards").insert({
      recipient_key: me.key,
      provider: provider.name,
      provider_card_id: card.providerCardId,
      last4: card.pan.slice(-4),
      exp: card.exp,
      pan_enc: encrypt(card.pan),
      cvv_enc: encrypt(card.cvv),
    });
    // A concurrent request won the unique "one active card" index: close the duplicate at the issuer.
    if (error) {
      await provider.closeCard(card.providerCardId);
      if (!isUniqueViolation(error)) throw new Error(error.message);
    }
  }

  must(await db().from("recipients").update({ status: "active" }).eq("key", me.key));
  // Failed payouts get another try on the new card, along with everything that was waiting.
  must(
    await db().from("payouts").update({ status: "unrouted", updated_at: now }).eq("recipient_key", me.key).eq("status", "failed"),
  );
  await routePayouts(me.key);
  return json({ ok: true }, { private: true });
});

/** Records that the card was added to a phone wallet. */
export const PATCH = route(async (req) => {
  const me = await requireRecipient(req);
  const body = await readJson<{ walletAdded?: boolean }>(req);
  const card = await activeCard(me.key);
  if (card && body.walletAdded)
    must(await db().from("cards").update({ wallet_added_at: new Date().toISOString() }).eq("id", card.id));
  return json({ ok: true }, { private: true });
});
