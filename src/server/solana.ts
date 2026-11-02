import "server-only";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  type Keypair,
  type TransactionInstruction,
} from "@solana/web3.js";
import { env } from "./env";
import { HttpError } from "./http";

let conn: Connection | null = null;
export function connection(): Connection {
  conn ??= new Connection(env.rpcUrl(), "confirmed");
  return conn;
}

export function parsePublicKey(value: unknown, field: string): PublicKey {
  try {
    if (typeof value !== "string") throw new Error();
    return new PublicKey(value);
  } catch {
    throw new HttpError(400, `Invalid ${field}`);
  }
}

export function computeBudget(units: number): TransactionInstruction[] {
  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: env.priorityFeeMicroLamports() }),
  ];
}

/** Builds a v0 transaction; signs with `signers` when given (the payer may sign later). */
export async function buildTransaction(payer: PublicKey, instructions: TransactionInstruction[], signers: Keypair[] = []) {
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash("confirmed");
  const message = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  if (signers.length) tx.sign(signers);
  return { tx, lastValidBlockHeight };
}

export class TxFailedError extends Error {
  constructor(
    public signature: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Broadcasts a fully signed transaction and waits for confirmation, rebroadcasting until it lands,
 * fails, or its blockhash expires.
 */
export async function sendAndConfirm(raw: Uint8Array, lastValidBlockHeight?: number, timeoutMs = 90_000): Promise<string> {
  const c = connection();
  const signature = await c.sendRawTransaction(raw, { skipPreflight: false, maxRetries: 0, preflightCommitment: "confirmed" });
  await confirm(signature, { raw, lastValidBlockHeight, timeoutMs });
  return signature;
}

export async function confirm(
  signature: string,
  { raw, lastValidBlockHeight, timeoutMs = 90_000 }: { raw?: Uint8Array; lastValidBlockHeight?: number; timeoutMs?: number } = {},
) {
  const c = connection();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value } = await c.getSignatureStatuses([signature], { searchTransactionHistory: false });
    const status = value[0];
    if (status?.err) throw new TxFailedError(signature, `Transaction failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
    if (lastValidBlockHeight != null && (await c.getBlockHeight("confirmed")) > lastValidBlockHeight)
      throw new TxFailedError(signature, "Transaction expired before it landed, try again");
    if (raw) await c.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new TxFailedError(signature, "Timed out waiting for confirmation");
}

/** Net change of `owner`'s balance of `mint` in a confirmed transaction, in raw units. */
export async function tokenDelta(signature: string, owner: PublicKey, mint: string): Promise<bigint> {
  const tx = await connection().getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx?.meta) throw new Error(`Transaction ${signature} not found`);
  const sum = (balances: typeof tx.meta.postTokenBalances) =>
    (balances ?? [])
      .filter((b) => b.mint === mint && b.owner === owner.toBase58())
      .reduce((acc, b) => acc + BigInt(b.uiTokenAmount.amount), 0n);
  return sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
}
