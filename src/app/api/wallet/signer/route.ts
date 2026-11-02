import { requireRecipient } from "@/server/auth";
import { json, route } from "@/server/http";
import { syncRecipient } from "@/server/wallet";

export const dynamic = "force-dynamic";

/** Call after the recipient approves our signer in the browser: re-reads the wallet's signers from Privy. */
export const POST = route(async (req) => {
  const me = await requireRecipient(req);
  const r = await syncRecipient(me);
  return json({ autoPayouts: r.auto_payouts }, { private: true });
});
