import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { HttpError } from "./http";

let client: SupabaseClient | null = null;

/** Service-role client, used only on the server (the browser never reads tables). */
export function db(): SupabaseClient {
  client ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Unwraps a Supabase result, turning errors into 500s. */
export function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data as T;
}

/** Postgres unique-violation, e.g. a second active card for the same recipient. */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export type RecipientRow = {
  key: string;
  kind: "phone" | "email";
  contact: string;
  masked: string;
  status: "pending" | "active";
  privy_user_id: string | null;
  wallet_id: string | null;
  wallet_address: string | null;
  /** Our server signer is on the wallet, so the keeper can collect and convert fees. */
  auto_payouts: boolean;
  claimed_at: string | null;
  created_at: string;
};

export type CoinRow = {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_url: string | null;
  metadata_uri: string;
  twitter: string | null;
  website: string | null;
  creator_wallet: string;
  /** pump.fun creator of the coin: the recipient's Privy wallet. */
  creator_key: string;
  quote_mint: string;
  recipient_key: string;
  fees_swept_lamports: number;
  fees_swept_usd_cents: number;
  launch_signature: string;
  created_at: string;
};

export type CardRow = {
  id: string;
  recipient_key: string;
  provider: string;
  provider_card_id: string;
  last4: string;
  exp: string;
  pan_enc: string;
  cvv_enc: string;
  status: "active" | "closed";
  wallet_added_at: string | null;
  created_at: string;
  closed_at: string | null;
};

export type PayoutRow = {
  id: string;
  /** Null when the recipient's wallet collects fees for several coins at once. */
  mint: string | null;
  recipient_key: string;
  status: "sweeping" | "swept" | "swapped" | "unrouted" | "submitted" | "paid" | "failed";
  quote_amount: string;
  lamports: number;
  usdc_amount: number | null;
  usd_cents: number | null;
  sweep_signature: string | null;
  swap_signature: string | null;
  card_id: string | null;
  transfer_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export function assertConfigured() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new HttpError(503, "Backend not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}
