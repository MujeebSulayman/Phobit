import "server-only";
import { HttpError } from "./http";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new HttpError(503, `Server misconfigured: ${name} is not set`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

/** Read lazily so a missing variable only breaks the endpoints that need it. */
export const env = {
  /** Supabase is the database. The service-role key never leaves the server. */
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  /** Privy: phone sign-in and the recipients' wallets. */
  privyAppId: () => required("NEXT_PUBLIC_PRIVY_APP_ID"),
  privyAppSecret: () => required("PRIVY_APP_SECRET"),
  /** Key quorum id of our server signer, added to every recipient wallet we create. */
  privySignerId: () => required("NEXT_PUBLIC_PRIVY_SIGNER_ID"),
  /** Private key of that key quorum (base64 PKCS8, the "wallet-auth:" prefix is optional). */
  privyAuthorizationKey: () => required("PRIVY_AUTHORIZATION_KEY").replace(/^wallet-auth:/, ""),
  /** Optional policy limiting what our signer may do with recipient wallets. */
  privyPolicyId: () => process.env.NEXT_PUBLIC_PRIVY_POLICY_ID || "",
  rpcUrl: () => required("SOLANA_RPC_URL"),
  /** Base58 secret key or JSON byte array. Pays network fees for recipient wallets (they hold no SOL). */
  treasurySecret: () => required("TREASURY_SECRET_KEY"),
  /** Quote asset every coin is paired with (AAPLx). Must be accepted by pump.fun create_v2. */
  quoteMint: () => required("QUOTE_MINT"),
  creatorFeeBps: () => Number(optional("CREATOR_FEE_BPS", "300")),
  priorityFeeMicroLamports: () => Number(optional("PRIORITY_FEE_MICRO_LAMPORTS", "100000")),
  minSweepLamports: () => Number(optional("MIN_SWEEP_LAMPORTS", "5000000")),
  pinataJwt: () => required("PINATA_JWT"),
  ipfsGateway: () => optional("IPFS_PUBLIC_GATEWAY", "https://ipfs.io"),
  jupiterUrl: () => optional("JUPITER_API_URL", "https://lite-api.jup.ag").replace(/\/$/, ""),
  jupiterKey: () => process.env.JUPITER_API_KEY ?? "",
  cardProvider: () => optional("CARD_PROVIDER", "sandbox"),
  /** 32 bytes, hex. Encrypts stored card numbers. */
  cardEncryptionKey: () => required("CARD_ENCRYPTION_KEY"),
  cronSecret: () => required("CRON_SECRET"),
};

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";
