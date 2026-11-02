import "server-only";
import { NextResponse, type NextRequest } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, init?: ResponseInit & { private?: boolean }) {
  const res = NextResponse.json(body, init);
  if (init?.private) res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Wraps a route handler: HttpErrors become `{ error }` responses, anything else a logged 500. */
export function route<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, e);
      return json({ error: "Internal error" }, { status: 500 });
    }
  };
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
