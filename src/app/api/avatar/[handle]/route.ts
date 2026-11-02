import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/** Serves the X profile pictures used in the home-page marquee from /public/avatars. */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return new NextResponse("Not found", { status: 404 });
  try {
    const file = await readFile(path.join(process.cwd(), "public", "avatars", `${handle}.jpg`));
    return new NextResponse(file, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, immutable" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
