import { assertConfigured } from "@/server/db";
import { json, readJson, route } from "@/server/http";
import { submit } from "@/server/launch";

export const maxDuration = 120;

/** Verifies the signed transaction is the one prepared for this mint, broadcasts it and records the coin. */
export const POST = route(async (req) => {
  assertConfigured();
  return json(await submit(await readJson(req)));
});
