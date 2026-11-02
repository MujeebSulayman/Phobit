import { requireRecipient } from "@/server/auth";
import { json, readJson, route } from "@/server/http";
import { buildWithdraw, submitWithdraw } from "@/server/wallet";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Builds a USDC withdrawal from the recipient's wallet, fee paid by the treasury. Bearer only. */
export const POST = route(async (req) => {
  const me = await requireRecipient(req);
  return json(await buildWithdraw(me, await readJson(req)), { private: true });
});

/** Broadcasts the withdrawal once the recipient has signed it in the browser. */
export const PUT = route(async (req) => {
  const me = await requireRecipient(req);
  return json(await submitWithdraw(me, await readJson(req)), { private: true });
});
