import "server-only";
import { neon, types, type NeonQueryFunction } from "@neondatabase/serverless";
import { env } from "./env";
import { HttpError } from "./http";

/** Postgres timestamp text ("2026-10-31 07:18:34.0075+00") → ISO 8601, which every browser parses. */
const toIso = (v: string) => new Date(v.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).toISOString();

// Return rows in the shapes the API already uses: numbers instead of int8/numeric strings,
// ISO strings instead of Date objects.
const PARSERS: Record<number, (v: string) => unknown> = {
  20: Number, // int8 (bigint, count(*))
  1700: Number, // numeric
  1184: toIso, // timestamptz
  1082: (v) => v, // date stays "YYYY-MM-DD"
};

let client: NeonQueryFunction<false, false> | null = null;

function neonClient() {
  client ??= neon(env.databaseUrl(), {
    types: { getTypeParser: (id: number, format?: string) => PARSERS[id] ?? types.getTypeParser(id, format as "text") },
  });
  return client;
}

/**
 * Parameterised query against Neon over HTTP: interpolated values are sent as bind parameters,
 * never spliced into the SQL text.
 */
export function sql<T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
  return neonClient()(strings, ...values) as unknown as Promise<T[]>;
}

/** Runs the queries built by `build` in one Postgres transaction (all or nothing). */
export async function transaction(build: (q: NeonQueryFunction<false, false>) => ReturnType<NeonQueryFunction<false, false>>[]) {
  const c = neonClient();
  await c.transaction(build(c));
}

/** First row or null. */
export async function one<T>(rows: Promise<T[]>): Promise<T | null> {
  return (await rows)[0] ?? null;
}

/** Postgres unique-violation, e.g. a second active card for the same recipient. */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

export type RecipientRow = {
  key: string;
  kind: "phone" | "email";
  contact: string;
  masked: string;
  status: "pending" | "active";
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
  mint: string;
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
  if (!process.env.DATABASE_URL) throw new HttpError(503, "Backend not configured: set DATABASE_URL");
}
