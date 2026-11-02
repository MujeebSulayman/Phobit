import { json, readJson, route } from "@/server/http";
import { buildDevBuySwap, sendDevBuySwap } from "@/server/launch";
import { parsePublicKey } from "@/server/solana";

export const maxDuration = 120;

/** Builds the unsigned SOL → quote-asset swap for the initial buy. */
export const POST = route(async (req) => {
  const body = await readJson<{ user?: unknown; solAmount?: unknown }>(req);
  parsePublicKey(body.user, "user");
  return json(await buildDevBuySwap(body));
});

/** Broadcasts the signed swap and returns the quote asset received (raw units, as `aaplx`). */
export const PUT = route(async (req) => {
  const body = await readJson<{ user?: unknown; signedTransaction?: unknown }>(req);
  parsePublicKey(body.user, "user");
  return json(await sendDevBuySwap(body));
});
