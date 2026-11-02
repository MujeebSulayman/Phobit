import "server-only";
import { AddressLookupTableAccount, PublicKey, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import { env } from "./env";
import { HttpError } from "./http";
import { connection } from "./solana";

export async function jupiterFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (env.jupiterKey()) headers.set("x-api-key", env.jupiterKey());
  const res = await fetch(`${env.jupiterUrl()}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) throw new HttpError(502, `Jupiter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

export type Quote = { inAmount: string; outAmount: string; otherAmountThreshold: string } & Record<string, unknown>;

export function quote(inputMint: string, outputMint: string, amount: bigint, slippageBps = 100) {
  const q = new URLSearchParams({ inputMint, outputMint, amount: amount.toString(), slippageBps: String(slippageBps) });
  return jupiterFetch<Quote>(`/swap/v1/quote?${q}`);
}

/** Builds an unsigned swap transaction for `user` from a quote. */
export async function swapTransaction(q: Quote, user: PublicKey) {
  const body = await jupiterFetch<{ swapTransaction: string; lastValidBlockHeight: number }>("/swap/v1/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: q,
      userPublicKey: user.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  return {
    tx: VersionedTransaction.deserialize(Buffer.from(body.swapTransaction, "base64")),
    lastValidBlockHeight: body.lastValidBlockHeight,
  };
}

type JupIx = { programId: string; accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[]; data: string };

function toInstruction(ix: JupIx): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((a) => ({ pubkey: new PublicKey(a.pubkey), isSigner: a.isSigner, isWritable: a.isWritable })),
    data: Buffer.from(ix.data, "base64"),
  });
}

/**
 * Swap instructions for `user`, so the caller can assemble the transaction with a different fee
 * payer (the treasury) — recipient wallets hold no SOL. Output token accounts must already exist.
 */
export async function swapInstructions(q: Quote, user: PublicKey) {
  const body = await jupiterFetch<{
    computeBudgetInstructions: JupIx[];
    setupInstructions: JupIx[];
    swapInstruction: JupIx;
    cleanupInstruction?: JupIx | null;
    otherInstructions?: JupIx[];
    addressLookupTableAddresses: string[];
  }>("/swap/v1/swap-instructions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quoteResponse: q, userPublicKey: user.toBase58(), wrapAndUnwrapSol: false, dynamicComputeUnitLimit: true }),
  });
  const conn = connection();
  const tables = await Promise.all(
    body.addressLookupTableAddresses.map(async (a) => (await conn.getAddressLookupTable(new PublicKey(a))).value),
  );
  return {
    instructions: [
      ...body.computeBudgetInstructions,
      ...body.setupInstructions,
      body.swapInstruction,
      ...(body.cleanupInstruction ? [body.cleanupInstruction] : []),
      ...(body.otherInstructions ?? []),
    ].map(toInstruction),
    lookupTables: tables.filter((t): t is AddressLookupTableAccount => t != null),
  };
}
