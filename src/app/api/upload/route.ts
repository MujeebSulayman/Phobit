import { HttpError, json, route } from "@/server/http";
import { upload } from "@/server/launch";

/** Pins the coin image and its metadata JSON to IPFS. */
export const POST = route(async (req) => {
  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Expected multipart form data");
  });
  return json(await upload(form));
});
