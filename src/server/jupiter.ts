import "server-only";
import { VersionedTransaction, type PublicKey } from "@solana/web3.js";
import { env } from "./env";
import { HttpError } from "./http";

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
