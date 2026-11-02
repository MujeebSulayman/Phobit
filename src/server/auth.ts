import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { maskContact } from "@/lib/contact";
import { env } from "./env";
import { HttpError } from "./http";

let supabase: SupabaseClient | null = null;
function authClient(): SupabaseClient {
  supabase ??= createClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

export type Me = { key: string; kind: "phone"; contact: string; masked: string };

/**
 * Resolves the recipient identity from the claim session's Supabase access token.
 * The identity always comes from the verified token, never from the request body.
 */
export async function requireRecipient(req: NextRequest): Promise<Me> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Sign in required");
  const { data, error } = await authClient().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expired, sign in again");
  const phone = data.user.phone;
  if (!phone || !data.user.phone_confirmed_at) throw new HttpError(403, "Phone number not verified");
  const contact = `+${phone.replace(/\D/g, "")}`;
  return { key: `phone:${contact}`, kind: "phone", contact, masked: maskContact("phone", contact) };
}

export function isCron(req: NextRequest, secret: string): boolean {
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
