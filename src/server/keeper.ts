import "server-only";
import { PUMP_SDK } from "@pump-fun/pump-sdk";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { creatorKeypair, treasuryKeypair } from "./crypto";
import { sql, transaction, type CoinRow, type PayoutRow } from "./db";
import { env, SOL_MINT, USDC_MINT } from "./env";
import * as jupiter from "./jupiter";
import { reconcileLaunches } from "./launch";
import { usdPrices } from "./prices";
import { liveState, pump, quoteMint } from "./pump";
import { routePayouts, settlePayouts } from "./routing";
import { buildTransaction, computeBudget, confirm, connection, sendAndConfirm, tokenDelta, TxFailedError } from "./solana";

const LEASE_MINUTES = 9;

async function acquireLock(): Promise<boolean> {
  const rows = await sql`
    update keeper_lock set locked_until = now() + make_interval(mins => ${LEASE_MINUTES})
    where id = 1 and locked_until < now()
    returning id`;
  return rows.length > 0;
}

async function releaseLock() {
  await sql`update keeper_lock set locked_until = 'epoch' where id = 1`;
}

async function tokenBalance(ata: PublicKey): Promise<bigint> {
  try {
    return BigInt((await connection().getTokenAccountBalance(ata, "confirmed")).value.amount);
  } catch {
    return 0n; // account doesn't exist yet
  }
}

/** Sweeps that crashed mid-flight: confirm or discard them before sweeping again. */
async function reconcileSweeps() {
  const rows = await sql<PayoutRow>`select id, sweep_signature, created_at from payouts where status = 'sweeping'`;
  for (const p of rows) {
    if (!p.sweep_signature) continue;
    const { value } = await connection().getSignatureStatuses([p.sweep_signature], { searchTransactionHistory: true });
    const s = value[0];
    if (s && !s.err && s.confirmationStatus !== "processed")
      await sql`update payouts set status = 'swept', updated_at = now() where id = ${p.id}`;
    else if (s?.err || Date.now() - new Date(p.created_at).getTime() > 5 * 60_000)
      await sql`delete from payouts where id = ${p.id}`;
  }
}

/**
 * Collects one coin's creator fees and moves them to the treasury in a single transaction:
 * sweep fees v3 trades left on the curve → collect both vaults into the creator's ATA → transfer to treasury.
 */
async function sweepCoin(coin: CoinRow, minUsd: number, quoteUsd: number) {
  const mint = new PublicKey(coin.mint);
  const creator = creatorKeypair(mint);
  if (creator.publicKey.toBase58() !== coin.creator_key) throw new Error(`Creator key mismatch for ${coin.mint} (MASTER_SEED changed?)`);
  const treasury = treasuryKeypair();
  const quote = await quoteMint();
  const state = await liveState(mint, creator.publicKey);
  if (!state.quoteMint.equals(quote.mint)) return; // not ours to price

  const creatorAta = getAssociatedTokenAddressSync(quote.mint, creator.publicKey, true, quote.quoteTokenProgram);
  const treasuryAta = getAssociatedTokenAddressSync(quote.mint, treasury.publicKey, false, quote.quoteTokenProgram);
  const total = state.unsweptQuote + (await tokenBalance(creatorAta));
  const usd = (Number(total) / 10 ** quote.decimals) * quoteUsd;
  if (total === 0n || usd < minUsd) return;

  const instructions = [
    ...computeBudget(400_000),
    ...(state.curveCreatorFee > 0n
      ? [
          await PUMP_SDK.sweepCreatorFeeInstruction({
            payer: treasury.publicKey,
            mint,
            creator: creator.publicKey,
            quoteMint: quote.mint,
            quoteTokenProgram: quote.quoteTokenProgram,
          }),
        ]
      : []),
    ...(await pump().collectCoinCreatorFeeV2Instructions(creator.publicKey, quote.mint, quote.quoteTokenProgram, treasury.publicKey)),
    createAssociatedTokenAccountIdempotentInstruction(treasury.publicKey, treasuryAta, treasury.publicKey, quote.mint, quote.quoteTokenProgram),
    createTransferCheckedInstruction(creatorAta, quote.mint, treasuryAta, creator.publicKey, total, quote.decimals, [], quote.quoteTokenProgram),
  ];
  const { tx, lastValidBlockHeight } = await buildTransaction(treasury.publicKey, instructions, [treasury, creator]);
  const signature = bs58.encode(tx.signatures[0]);

  // Record intent before broadcasting so a crash can't strand funds unattributed.
  const [row] = await sql<{ id: string }>`
    insert into payouts (mint, recipient_key, status, quote_amount, sweep_signature)
    values (${coin.mint}, ${coin.recipient_key}, 'sweeping', ${total.toString()}, ${signature})
    returning id`;
  try {
    await sendAndConfirm(tx.serialize(), lastValidBlockHeight);
    await sql`update payouts set status = 'swept', updated_at = now() where id = ${row.id}`;
  } catch (e) {
    if (e instanceof TxFailedError) await sql`delete from payouts where id = ${row.id}`;
    throw e;
  }
}

/** Swaps each swept payout's quote asset to USDC; the USDC received is the payout's dollar value. */
async function swapPayouts() {
  const treasury = treasuryKeypair();
  const rows = await sql<PayoutRow>`select * from payouts where status = 'swept' order by created_at limit 50`;
  for (const p of rows) {
    try {
      let signature = p.swap_signature;
      if (signature) {
        await confirm(signature, { timeoutMs: 10_000 }); // a previous run sent it; throws if it failed
      } else {
        const q = await jupiter.quote(env.quoteMint(), USDC_MINT, BigInt(p.quote_amount), 100);
        const { tx, lastValidBlockHeight } = await jupiter.swapTransaction(q, treasury.publicKey);
        tx.sign([treasury]);
        signature = bs58.encode(tx.signatures[0]);
        await sql`update payouts set swap_signature = ${signature}, updated_at = now() where id = ${p.id}`;
        await sendAndConfirm(tx.serialize(), lastValidBlockHeight);
      }
      const usdcRaw = await tokenDelta(signature, treasury.publicKey, USDC_MINT);
      const usdc = Number(usdcRaw) / 1e6;
      const sol = (await usdPrices())[SOL_MINT];
      const lamports = sol ? Math.round((usdc / sol) * 1e9) : 0;
      const cents = Math.floor(usdc * 100);
      await transaction((q) => [
        q`update payouts
          set status = 'swapped', usdc_amount = ${usdc}, usd_cents = ${cents}, lamports = ${lamports}, updated_at = now()
          where id = ${p.id}`,
        q`update coins
          set fees_swept_lamports = fees_swept_lamports + ${lamports}, fees_swept_usd_cents = fees_swept_usd_cents + ${cents}
          where mint = ${p.mint}`,
      ]);
    } catch (e) {
      // A failed/expired swap leaves the quote asset in the treasury: clear the signature to retry.
      if (e instanceof TxFailedError && !/Timed out/.test(e.message))
        await sql`update payouts set swap_signature = null, updated_at = now() where id = ${p.id}`;
      console.error(`[keeper] swap for payout ${p.id} failed`, e);
    }
  }
}

export type KeeperReport = { ran: boolean; coins: number; errors: string[] };

/** One keeper pass. Every stage is resumable, so a run that dies midway is finished by the next. */
export async function runKeeper(): Promise<KeeperReport> {
  if (!(await acquireLock())) return { ran: false, coins: 0, errors: ["Another keeper run holds the lock"] };
  const errors: string[] = [];
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      console.error(`[keeper] ${name}`, e);
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  let coins: CoinRow[] = [];
  try {
    await step("reconcile launches", reconcileLaunches);
    await step("reconcile sweeps", reconcileSweeps);
    await step("sweep", async () => {
      const prices = await usdPrices();
      const quoteUsd = prices[env.quoteMint()];
      const sol = prices[SOL_MINT];
      if (!quoteUsd || !sol) throw new Error("Prices unavailable, skipping sweeps");
      const minUsd = (env.minSweepLamports() / 1e9) * sol;
      coins = await sql<CoinRow>`select * from coins order by created_at`;
      for (const coin of coins) await step(`sweep ${coin.mint}`, () => sweepCoin(coin, minUsd, quoteUsd));
    });
    await step("swap", swapPayouts);
    await step("route", () => routePayouts());
    await step("settle", settlePayouts);
  } finally {
    await releaseLock();
  }
  return { ran: true, coins: coins.length, errors };
}
