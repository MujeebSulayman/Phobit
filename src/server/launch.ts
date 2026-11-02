import "server-only";
import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";
import { parseContact, maskContact } from "@/lib/contact";
import { one, sql } from "./db";
import { env, SOL_MINT } from "./env";
import { HttpError } from "./http";
import * as jupiter from "./jupiter";
import { ipfsUrl, pinFile, pinJson } from "./pinata";
import { hasServerSigner, walletForPhone } from "./privy";
import { createInstructions, quoteMint } from "./pump";
import { buildTransaction, computeBudget, confirm, connection, sendAndConfirm, tokenDelta, TxFailedError } from "./solana";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DEV_BUY_SOL = 50;

function text(value: unknown, field: string, max: number, required = false): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return s;
}

function url(value: unknown, field: string): string {
  const s = text(value, field, 200);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    return u.toString();
  } catch {
    throw new HttpError(400, `${field} must be a URL`);
  }
}

function twitter(value: unknown): string {
  const s = text(value, "Twitter", 200);
  if (!s) return "";
  const handle = s.replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `https://x.com/${handle}` : url(s, "Twitter");
}

function fail(e: unknown): never {
  if (e instanceof TxFailedError) throw new HttpError(400, e.message);
  throw e;
}

/** POST /api/upload — pins the image and the pump.fun metadata JSON. */
export async function upload(form: FormData) {
  const image = form.get("image");
  if (!(image instanceof File)) throw new HttpError(400, "Image is required");
  if (!IMAGE_TYPES.has(image.type)) throw new HttpError(400, "Image must be PNG, JPEG, WebP or GIF");
  if (image.size > MAX_IMAGE_BYTES) throw new HttpError(400, "Image must be 5 MB or smaller");
  const name = text(form.get("name"), "Name", 32, true);
  const symbol = text(form.get("symbol"), "Symbol", 10, true).toUpperCase();

  const imageCid = await pinFile(image, `${symbol}-image`);
  const imageUri = ipfsUrl(imageCid);
  const metadata = {
    name,
    symbol,
    description: text(form.get("description"), "Description", 1000),
    image: imageUri,
    showName: true,
    createdOn: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    twitter: twitter(form.get("twitter")) || undefined,
    website: url(form.get("website"), "Website") || undefined,
  };
  const metadataCid = await pinJson(metadata, `${symbol}-metadata`);
  return { uri: ipfsUrl(metadataCid), image: imageUri };
}

/** POST /api/launch/swap — unsigned SOL → quote-asset swap for the dev buy. */
export async function buildDevBuySwap(body: { user?: unknown; solAmount?: unknown }) {
  const user = new PublicKey(String(body.user ?? ""));
  const sol = Number(body.solAmount);
  if (!Number.isFinite(sol) || sol <= 0 || sol > MAX_DEV_BUY_SOL)
    throw new HttpError(400, `Initial buy must be between 0 and ${MAX_DEV_BUY_SOL} SOL`);
  const q = await jupiter.quote(SOL_MINT, env.quoteMint(), BigInt(Math.round(sol * 1e9)), 100);
  const { tx } = await jupiter.swapTransaction(q, user);
  return { transaction: Buffer.from(tx.serialize()).toString("base64"), expectedOut: q.outAmount };
}

/** PUT /api/launch/swap — broadcasts the user-signed swap, returns how much quote asset arrived. */
export async function sendDevBuySwap(body: { user?: unknown; signedTransaction?: unknown }) {
  const user = new PublicKey(String(body.user ?? ""));
  const raw = Buffer.from(String(body.signedTransaction ?? ""), "base64");
  const tx = VersionedTransaction.deserialize(raw);
  if (!tx.message.staticAccountKeys[0]?.equals(user)) throw new HttpError(400, "Swap must be paid by the connected wallet");
  const signature = await sendAndConfirm(raw).catch(fail);
  const received = await tokenDelta(signature, user, env.quoteMint());
  if (received <= 0n) throw new HttpError(400, "Swap landed but no quote asset was received");
  return { signature, aaplx: received.toString() };
}

type PreparePayload = {
  name: string;
  symbol: string;
  description: string;
  uri: string;
  image: string;
  twitter: string;
  website: string;
  recipient: {
    key: string;
    kind: "phone";
    contact: string;
    masked: string;
    privy_user_id: string;
    wallet_id: string;
    wallet_address: string;
    auto_payouts: boolean;
  };
};

/** POST /api/launch/prepare — builds create(+buy), signs it with a fresh mint, stores what was signed. */
export async function prepare(body: Record<string, unknown>) {
  const user = new PublicKey(String(body.user ?? ""));
  const name = text(body.name, "Name", 32, true);
  const symbol = text(body.symbol, "Symbol", 10, true).toUpperCase();
  const uri = text(body.uri, "Metadata URI", 200, true);
  if (!uri.startsWith(`${env.ipfsGateway().replace(/\/$/, "")}/ipfs/`)) throw new HttpError(400, "Upload metadata first");

  const r = body.recipient as { kind?: unknown; value?: unknown } | undefined;
  if (r?.kind !== "phone") throw new HttpError(400, "Recipient must be a phone number");
  const parsed = parseContact("phone", String(r.value ?? ""));
  if ("error" in parsed) throw new HttpError(400, parsed.error);

  const quoteAmountStr = String(body.quoteAmount ?? "0");
  if (!/^\d{1,30}$/.test(quoteAmountStr)) throw new HttpError(400, "Invalid quoteAmount");

  // The coin's pump.fun creator is the recipient's own Privy wallet, created now if they've never
  // signed in. Fees accrue to that wallet's vault: nobody else, including us, owns them.
  const recipientWallet = await recipientWalletFor(parsed.key, parsed.contact);
  const mint = Keypair.generate();
  const creator = new PublicKey(recipientWallet.wallet_address);
  const instructions = await createInstructions({
    mint: mint.publicKey,
    creator,
    user,
    name,
    symbol,
    uri,
    quoteAmount: new BN(quoteAmountStr),
  });
  const { tx, lastValidBlockHeight } = await buildTransaction(user, [...computeBudget(500_000), ...instructions]);
  tx.sign([mint]);

  const payload: PreparePayload = {
    name,
    symbol,
    description: text(body.description, "Description", 1000),
    uri,
    image: text(body.image, "Image", 200),
    twitter: twitter(body.twitter),
    website: url(body.website, "Website"),
    recipient: { key: parsed.key, kind: "phone", contact: parsed.contact, masked: maskContact("phone", parsed.contact), ...recipientWallet },
  };
  await sql`
    insert into pending_launches (mint, user_wallet, message, last_valid_block_height, payload)
    values (${mint.publicKey.toBase58()}, ${user.toBase58()}, ${Buffer.from(tx.message.serialize()).toString("base64")},
            ${lastValidBlockHeight}, ${JSON.stringify(payload)}::jsonb)`;
  return { mint: mint.publicKey.toBase58(), transaction: Buffer.from(tx.serialize()).toString("base64") };
}

/** The recipient's wallet: from our records when we've seen the number before, otherwise from Privy. */
async function recipientWalletFor(key: string, contact: string) {
  const known = await one(
    sql<{ privy_user_id: string | null; wallet_id: string | null; wallet_address: string | null; auto_payouts: boolean }>`
      select privy_user_id, wallet_id, wallet_address, auto_payouts from recipients where key = ${key}`,
  );
  if (known?.privy_user_id && known.wallet_id && known.wallet_address)
    return { privy_user_id: known.privy_user_id, wallet_id: known.wallet_id, wallet_address: known.wallet_address, auto_payouts: known.auto_payouts };
  const w = await walletForPhone(contact);
  return { privy_user_id: w.privyUserId, wallet_id: w.walletId, wallet_address: w.address, auto_payouts: await hasServerSigner(w.walletId) };
}

type PendingRow = {
  mint: string;
  user_wallet: string;
  message: string;
  last_valid_block_height: number;
  payload: PreparePayload;
  signature: string | null;
};

/** POST /api/launch/submit — refuses anything but the exact transaction prepare signed, then broadcasts. */
export async function submit(body: { mint?: unknown; signedTransaction?: unknown }) {
  const mint = String(body.mint ?? "");
  const pending = await one(sql<PendingRow>`select * from pending_launches where mint = ${mint}`);
  if (!pending) throw new HttpError(404, "Unknown or expired launch, start again");

  const raw = Buffer.from(String(body.signedTransaction ?? ""), "base64");
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(raw);
  } catch {
    throw new HttpError(400, "Invalid transaction");
  }
  if (Buffer.from(tx.message.serialize()).toString("base64") !== pending.message)
    throw new HttpError(400, "Transaction does not match the prepared launch");
  if (tx.signatures.some((s) => s.every((b) => b === 0))) throw new HttpError(400, "Transaction is not fully signed");

  const signature = await connection().sendRawTransaction(raw, { skipPreflight: false, maxRetries: 0 }).catch((e) => {
    throw new HttpError(400, `Simulation failed: ${e instanceof Error ? e.message : e}`);
  });
  await sql`update pending_launches set signature = ${signature} where mint = ${mint}`;
  await confirm(signature, { raw, lastValidBlockHeight: pending.last_valid_block_height }).catch(fail);
  await finalize({ ...pending, signature });
  return { mint, signature };
}

/** Records the confirmed launch. Idempotent; also used by the keeper to recover launches the client lost. */
export async function finalize(pending: PendingRow & { signature: string }) {
  const { payload } = pending;
  const quote = await quoteMint();
  const coin = {
    name: payload.name,
    symbol: payload.symbol,
    description: payload.description,
    image_url: payload.image || null,
    metadata_uri: payload.uri,
    twitter: payload.twitter || null,
    website: payload.website || null,
    creator_wallet: pending.user_wallet,
    creator_key: payload.recipient.wallet_address,
    quote_mint: quote.mint.toBase58(),
    launch_signature: pending.signature,
  };
  await sql`select finalize_launch(${pending.mint}, ${JSON.stringify(payload.recipient)}::jsonb, ${JSON.stringify(coin)}::jsonb)`;
}

/** Keeper: promote launches that confirmed after the client gave up; drop stale ones. */
export async function reconcileLaunches() {
  const rows = await sql<PendingRow>`select * from pending_launches order by created_at limit 100`;
  const height = rows.length ? await connection().getBlockHeight("confirmed") : 0;
  for (const p of rows) {
    if (p.signature) {
      const { value } = await connection().getSignatureStatuses([p.signature], { searchTransactionHistory: true });
      const s = value[0];
      if (s && !s.err && (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized")) {
        await finalize({ ...p, signature: p.signature });
        continue;
      }
    }
    // Past its blockhash's lifetime (plus margin) the transaction can never land.
    if (height > Number(p.last_valid_block_height) + 150) await sql`delete from pending_launches where mint = ${p.mint}`;
  }
}
