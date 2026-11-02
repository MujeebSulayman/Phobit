import { requireRecipient } from "@/server/auth";
import { assertConfigured } from "@/server/db";
import { json, route } from "@/server/http";
import { listPayouts } from "@/server/queries";

export const dynamic = "force-dynamic";

/** Sweep ledger with masked recipients. ?mine=1 with a claim bearer token returns only yours. */
export const GET = route(async (req) => {
  assertConfigured();
  const params = req.nextUrl.searchParams;
  const limit = Number(params.get("limit") ?? 100) || 100;
  if (params.get("mine") === "1") {
    const me = await requireRecipient(req);
    return json({ payouts: await listPayouts({ limit, recipientKey: me.key }) }, { private: true });
  }
  return json({ payouts: await listPayouts({ limit }) });
});
