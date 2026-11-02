import { assertConfigured } from "@/server/db";
import { HttpError, json, route } from "@/server/http";
import { solUsd } from "@/server/prices";
import { getCoin } from "@/server/queries";

export const dynamic = "force-dynamic";

/** One coin with live curve state, market cap, unswept fees and recipient claim status. */
export const GET = route(async (_req, { params }: { params: Promise<{ mint: string }> }) => {
  assertConfigured();
  const { mint } = await params;
  const [coin, sol] = await Promise.all([getCoin(mint), solUsd()]);
  if (!coin) throw new HttpError(404, "Not found");
  return json({ coin, solUsd: sol });
});
