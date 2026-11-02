import "server-only";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type { Me } from "./auth";
import { treasuryKeypair } from "./crypto";
import { one, sql, type RecipientRow } from "./db";
import { USDC_MINT } from "./env";
import { HttpError } from "./http";
import { hasServerSigner } from "./privy";
import { usdcBalance } from "./queries";
import { buildTransaction, computeBudget, sendAndConfirm, TxFailedError } from "./solana";

const MIN_WITHDRAW_USDC = 1;
const MAX_WITHDRAWALS_PER_HOUR = 5;

/**
 * Keeps our row for the signed-in recipient in step with Privy: their wallet, whether our signer is
 * on it, and when they first claimed. Works for people no coin names yet, too.
 */
export async function syncRecipient(me: Me): Promise<RecipientRow> {
  const existing = await one(sql<RecipientRow>`select * from recipients where key = ${me.key}`);
  const autoPayouts = me.wallet ? await hasServerSigner(me.wallet.id).catch(() => existing?.auto_payouts ?? false) : false;
  const fields = {
    privy_user_id: existing?.privy_user_id ?? me.privyUserId,
    wallet_id: existing?.wallet_id ?? me.wallet?.id ?? null,
    wallet_address: existing?.wallet_address ?? me.wallet?.address ?? null,
    auto_payouts: autoPayouts,
    claimed_at: existing?.claimed_at ?? new Date().toISOString(),
  };
  const [row] = await sql<RecipientRow>`
    insert into recipients (key, kind, contact, masked, privy_user_id, wallet_id, wallet_address, auto_payouts, claimed_at)
    values (${me.key}, ${me.kind}, ${me.contact}, ${me.masked}, ${fields.privy_user_id}, ${fields.wallet_id},
            ${fields.wallet_address}, ${fields.auto_payouts}, ${fields.claimed_at})
    on conflict (key) do update set
      privy_user_id = excluded.privy_user_id, wallet_id = excluded.wallet_id, wallet_address = excluded.wallet_address,
      auto_payouts = excluded.auto_payouts, claimed_at = excluded.claimed_at
    returning *`;
  return row;
}

function requireWallet(me: Me) {
  if (!me.wallet) throw new HttpError(409, "Your wallet is still being set up, try again in a moment");
  return { id: me.wallet.id, address: new PublicKey(me.wallet.address) };
}

/**
 * Builds a USDC transfer out of the recipient's wallet. The treasury pays the network fee and signs
 * now; the recipient adds their signature in the browser. Any change to the transaction would
 * invalidate the treasury's signature, so the submit step needs no further checks.
 */
export async function buildWithdraw(me: Me, body: { to?: unknown; amount?: unknown }) {
  const wallet = requireWallet(me);
  let to: PublicKey;
  try {
    to = new PublicKey(String(body.to ?? ""));
  } catch {
    throw new HttpError(400, "Enter a valid Solana address");
  }
  if (to.equals(wallet.address)) throw new HttpError(400, "That's your own wallet");
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAW_USDC) throw new HttpError(400, `Minimum withdrawal is ${MIN_WITHDRAW_USDC} USDC`);
  const raw = BigInt(Math.floor(amount * 1e6));
  if (raw > (await usdcBalance(wallet.address))) throw new HttpError(400, "Amount is more than your USDC balance");

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const [{ count }] = await sql<{ count: number }>`
    select count(*) from withdrawals where recipient_key = ${me.key} and created_at >= ${since}::timestamptz`;
  if (count >= MAX_WITHDRAWALS_PER_HOUR) throw new HttpError(429, "Too many withdrawals, try again later");

  const usdc = new PublicKey(USDC_MINT);
  const treasury = treasuryKeypair();
  const from = getAssociatedTokenAddressSync(usdc, wallet.address, true);
  const dest = getAssociatedTokenAddressSync(usdc, to, true);
  const { tx } = await buildTransaction(
    treasury.publicKey,
    [
      ...computeBudget(60_000),
      createAssociatedTokenAccountIdempotentInstruction(treasury.publicKey, dest, to, usdc),
      createTransferCheckedInstruction(from, usdc, dest, wallet.address, raw, 6),
    ],
    [treasury],
  );
  const signature = bs58.encode(tx.signatures[0]);
  await sql`
    insert into withdrawals (signature, recipient_key, to_address, usdc_amount)
    values (${signature}, ${me.key}, ${to.toBase58()}, ${Number(raw) / 1e6})`;
  return { transaction: Buffer.from(tx.serialize()).toString("base64"), signature };
}

/** Broadcasts a withdrawal the recipient signed. */
export async function submitWithdraw(me: Me, body: { signedTransaction?: unknown }) {
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(Buffer.from(String(body.signedTransaction ?? ""), "base64"));
  } catch {
    throw new HttpError(400, "Invalid transaction");
  }
  const signature = bs58.encode(tx.signatures[0]);
  const row = await one(
    sql<{ status: string }>`select status from withdrawals where signature = ${signature} and recipient_key = ${me.key}`,
  );
  if (!row) throw new HttpError(404, "Unknown withdrawal, start again");
  try {
    await sendAndConfirm(tx.serialize());
  } catch (e) {
    if (e instanceof TxFailedError) {
      await sql`update withdrawals set status = 'failed' where signature = ${signature}`;
      throw new HttpError(400, e.message);
    }
    throw new HttpError(400, `Could not send: ${e instanceof Error ? e.message : e}`);
  }
  await sql`update withdrawals set status = 'confirmed' where signature = ${signature}`;
  return { signature };
}
