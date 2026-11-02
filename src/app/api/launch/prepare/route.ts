import { assertConfigured } from "@/server/db";
import { json, readJson, route } from "@/server/http";
import { prepare } from "@/server/launch";
import { parsePublicKey } from "@/server/solana";

/** Builds the create (+ buy) transaction, partially signed by a fresh mint keypair. */
export const POST = route(async (req) => {
  assertConfigured();
  const body = await readJson<Record<string, unknown>>(req);
  parsePublicKey(body.user, "user");
  return json(await prepare(body));
});
