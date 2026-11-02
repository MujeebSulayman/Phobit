import { assertConfigured } from "@/server/db";
import { json, route } from "@/server/http";
import { solUsd } from "@/server/prices";
import { analytics } from "@/server/queries";

export const dynamic = "force-dynamic";

/** 30-day daily fee series and platform totals. */
export const GET = route(async () => {
  assertConfigured();
  const [data, sol] = await Promise.all([analytics(30), solUsd()]);
  return json({ ...data, solUsd: sol });
});
