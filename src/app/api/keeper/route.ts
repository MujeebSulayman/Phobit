import { isCron } from "@/server/auth";
import { env } from "@/server/env";
import { HttpError, json, route } from "@/server/http";
import { runKeeper } from "@/server/keeper";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Scheduled every 10 minutes (vercel.json). Requires `Authorization: Bearer $CRON_SECRET`. */
const handler = route(async (req) => {
  if (!isCron(req, env.cronSecret())) throw new HttpError(401, "Unauthorized");
  return json(await runKeeper(), { private: true });
});

export { handler as GET, handler as POST };
