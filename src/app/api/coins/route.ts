import { assertConfigured } from "@/server/db";
import { json, route } from "@/server/http";
import { solUsd } from "@/server/prices";
import { listCoins } from "@/server/queries";

export const dynamic = "force-dynamic";

/** Live coins, newest first. ?wallet= filters by launcher. */
export const GET = route(async (req) => {
  assertConfigured();
  const [coins, sol] = await Promise.all([listCoins(req.nextUrl.searchParams.get("wallet")), solUsd()]);
  return json({ coins, solUsd: sol });
});
