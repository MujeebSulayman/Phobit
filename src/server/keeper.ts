import "server-only";
import { PUMP_SDK } from "@pump-fun/pump-sdk";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ComputeBudgetProgram, PublicKey, type VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { treasuryKeypair } from "./crypto";
import { sql, type CoinRow, type PayoutRow, type RecipientRow } from "./db";
import { env, SOL_MINT, USDC_MINT } from "./env";
import * as jupiter from "./jupiter";
import { reconcileLaunches } from "./launch";
import { usdPrices } from "./prices";
import { signAsWallet } from "./privy";
import { pump, quoteMint, vaultBalance } from "./pump";
import { routePayouts, settlePayouts } from "./routing";
import { buildTransaction, computeBudget, confirm, connection, sendAndConfirm, tokenDelta, TxFailedError } from "./solana";

/** Recipient wallets hold no SOL: the treasury is the fee payer, the wallet co-signs through Privy. */
async function cosign(recipient: Pick<RecipientRow, "wallet_id">, tx: VersionedTransaction) {
  const signed = await signAsWallet(recipient.wallet_id!, tx);
  signed.sign([treasuryKeypair()]);
  return { signed, signature: bs58.encode(signed.signatures[0]) };
}

type SweepingRow = PayoutRow & { wallet_address: string | null };

/** Collections that crashed mid-flight: finish or discard them before collecting again. */
async function reconcileSweeps() {
  const quote = await quoteMint();
  const rows = await sql<SweepingRow>`
    select p.*, r.wallet_address from payouts p join recipients r on r.key = p.recipient_key where p.status = 'sweeping'`;
  for (const p of rows) {
    if (!p.sweep_signature || !p.wallet_address) continue;
    const { value } = await connection().getSignatureStatuses([p.sweep_signature], { searchTransactionHistory: true });
    const s = value[0];
    if (s && !s.err && s.confirmationStatus !== "processed") {
      const collected = await tokenDelta(p.sweep_signature, new PublicKey(p.wallet_address), quote.mint.toBase58());
      await sql`update payouts set status = 'swept', quote_amount = ${collected.toString()}, updated_at = now() where id = ${p.id}`;
    } else if (s?.err || Date.now() - new Date(p.created_at).getTime() > 5 * 60_000) {
      await sql`delete from payouts where id = ${p.id}`;
    }
  }
}

/**
 * Collects a recipient's creator fees into their own wallet. pump.fun keys the vault by creator, and
 * every coin naming this phone number has the same creator (their wallet), so one transaction covers
 * all of them: sweep what v3 trades left on each curve → collect the curve + AMM vaults.
 */
async function collectFor(recipient: RecipientRow, coins: CoinRow[], minUsd: number, quoteUsd: number) {
  const wallet = new PublicKey(recipient.wallet_address!);
  const treasury = treasuryKeypair().publicKey;
  const quote = await quoteMint();

  const curves = await Promise.all(coins.map(async (c) => ({ coin: c, curve: await pump().fetchBondingCurve(c.mint) })));
  const buckets = curves.filter(({ curve }) => curve.quoteMint.equals(quote.mint) && !curve.creatorFee.isZero());
  const total = (await vaultBalance(wallet)) + buckets.reduce((acc, b) => acc + BigInt(b.curve.creatorFee.toString()), 0n);
  if (total === 0n || (Number(total) / 10 ** quote.decimals) * quoteUsd < minUsd) return;

  const instructions = [
    ...computeBudget(400_000),
    ...(await Promise.all(
      buckets.map(({ coin }) =>
        PUMP_SDK.sweepCreatorFeeInstruction({
          payer: treasury,
          mint: new PublicKey(coin.mint),
          creator: wallet,
          quoteMint: quote.mint,
          quoteTokenProgram: quote.quoteTokenProgram,
        }),
      ),
    )),
    ...(await pump().collectCoinCreatorFeeV2Instructions(wallet, quote.mint, quote.quoteTokenProgram, treasury)),
  ];
  const { tx, lastValidBlockHeight } = await buildTransaction(treasury, instructions);
  const { signed, signature } = await cosign(recipient, tx);

  // Record intent before broadcasting so a crash can't lose track of a collection.
  const [row] = await sql<{ id: string }>`
    insert into payouts (mint, recipient_key, status, quote_amount, sweep_signature)
    values (${coins.length === 1 ? coins[0].mint : null}, ${recipient.key}, 'sweeping', ${total.toString()}, ${signature})
    returning id`;
  try {
    await sendAndConfirm(signed.serialize(), lastValidBlockHeight);
  } catch (e) {
    if (e instanceof TxFailedError) await sql`delete from payouts where id = ${row.id}`;
    throw e;
  }
  const collected = await tokenDelta(signature, wallet, quote.mint.toBase58());
  if (collected <= 0n) {
    await sql`delete from payouts where id = ${row.id}`;
    return;
  }
  await sql`update payouts set status = 'swept', quote_amount = ${collected.toString()}, updated_at = now() where id = ${row.id}`;
}

type SweptRow = PayoutRow & Pick<RecipientRow, "wallet_id" | "wallet_address" | "auto_payouts">;

/** Converts each collected payout to USDC inside the recipient's wallet; the USDC received is its dollar value. */
async function swapPayouts() {
  const treasury = treasuryKeypair().publicKey;
  const rows = await sql<SweptRow>`
    select p.*, r.wallet_id, r.wallet_address, r.auto_payouts
    from payouts p join recipients r on r.key = p.recipient_key
    where p.status = 'swept'
    order by p.created_at
    limit 50`;

  for (const p of rows) {
    const r = p;
    if (!r.wallet_id || !r.wallet_address || !r.auto_payouts) continue;
    const wallet = new PublicKey(r.wallet_address);
    try {
      let signature = p.swap_signature;
      if (signature) {
        await confirm(signature, { timeoutMs: 10_000 }); // a previous run sent it; throws if it failed
      } else {
        const q = await jupiter.quote(env.quoteMint(), USDC_MINT, BigInt(p.quote_amount), 100);
        const { instructions, lookupTables } = await jupiter.swapInstructions(q, wallet);
        const usdcAta = getAssociatedTokenAddressSync(new PublicKey(USDC_MINT), wallet, true);
        const { tx, lastValidBlockHeight } = await buildTransaction(
          treasury,
          [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: env.priorityFeeMicroLamports() }),
            createAssociatedTokenAccountIdempotentInstruction(treasury, usdcAta, wallet, new PublicKey(USDC_MINT)),
            ...instructions,
          ],
          [],
          lookupTables,
        );
        const cosigned = await cosign(r, tx);
        signature = cosigned.signature;
        await sql`update payouts set swap_signature = ${signature}, updated_at = now() where id = ${p.id}`;
        await sendAndConfirm(cosigned.signed.serialize(), lastValidBlockHeight);
      }
      const usdcRaw = await tokenDelta(signature, wallet, USDC_MINT);
      const usdc = Number(usdcRaw) / 1e6;
      const sol = (await usdPrices())[SOL_MINT];
      await sql`select record_swap(${p.id}::uuid, ${usdc}, ${Math.floor(usdc * 100)}, ${sol ? Math.round((usdc / sol) * 1e9) : 0})`;
    } catch (e) {
      // A failed or expired swap leaves the fees in the wallet untouched: clear the signature to retry.
      if (e instanceof TxFailedError && !/Timed out/.test(e.message))
        await sql`update payouts set swap_signature = null, updated_at = now() where id = ${p.id}`;
      console.error(`[keeper] swap for payout ${p.id} failed`, e);
    }
  }
}

export type KeeperReport = { ran: boolean; recipients: number; errors: string[] };

/** One keeper pass. Every stage is resumable, so a run that dies midway is finished by the next. */
export async function runKeeper(): Promise<KeeperReport> {
  const [{ locked }] = await sql<{ locked: boolean }>`select acquire_keeper_lock(9) as locked`;
  if (!locked) return { ran: false, recipients: 0, errors: ["Another keeper run holds the lock"] };
  const errors: string[] = [];
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      console.error(`[keeper] ${name}`, e);
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  let recipients = 0;
  try {
    await step("reconcile launches", reconcileLaunches);
    await step("reconcile collections", reconcileSweeps);
    await step("collect", async () => {
      const prices = await usdPrices();
      const quoteUsd = prices[env.quoteMint()];
      const sol = prices[SOL_MINT];
      if (!quoteUsd || !sol) throw new Error("Prices unavailable, skipping collection");
      const minUsd = (env.minSweepLamports() / 1e9) * sol;
      // Only wallets our signer may act on; the rest keep accruing safely until the owner opts in.
      const rows = await sql<RecipientRow>`select * from recipients where auto_payouts and wallet_id is not null`;
      const coins = await sql<CoinRow>`select * from coins where recipient_key = any(${rows.map((r) => r.key)}::text[])`;
      for (const r of rows) {
        const mine = coins.filter((c) => c.recipient_key === r.key && c.creator_key === r.wallet_address);
        if (!mine.length) continue;
        recipients++;
        await step(`collect ${r.masked}`, () => collectFor(r, mine, minUsd, quoteUsd));
      }
    });
    await step("swap", swapPayouts);
    await step("route", () => routePayouts());
    await step("settle", settlePayouts);
  } finally {
    await sql`select release_keeper_lock()`;
  }
  return { ran: true, recipients, errors };
}
