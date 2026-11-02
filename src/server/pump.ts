import "server-only";
import {
  OnlinePumpSdk,
  PUMP_SDK,
  bondingCurveMarketCap,
  creatorVaultPda,
  getBuyTokenAmountFromSolAmount,
  type ResolvedQuoteMint,
} from "@pump-fun/pump-sdk";
import { PublicKey, type TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import { env } from "./env";
import { HttpError } from "./http";
import { connection } from "./solana";

let online: OnlinePumpSdk | null = null;
export function pump(): OnlinePumpSdk {
  online ??= new OnlinePumpSdk(connection());
  return online;
}

let resolved: Promise<ResolvedQuoteMint> | null = null;
/** The configured quote mint with its token program and decimals; fails if pump.fun doesn't accept it. */
export function quoteMint(): Promise<ResolvedQuoteMint> {
  resolved ??= pump()
    .resolveQuoteMint(new PublicKey(env.quoteMint()))
    .catch((e) => {
      resolved = null;
      throw new HttpError(503, `Quote mint ${env.quoteMint()} is not supported by pump.fun: ${e instanceof Error ? e.message : e}`);
    });
  return resolved;
}

/** create_v2 (+ buy_v2 when `quoteAmount` > 0), quoted in the configured mint at CREATOR_FEE_BPS. */
export async function createInstructions(input: {
  mint: PublicKey;
  creator: PublicKey;
  user: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  quoteAmount: BN;
}): Promise<TransactionInstruction[]> {
  const sdk = pump();
  const [global, quote] = await Promise.all([sdk.fetchGlobal(), quoteMint()]);
  const bps = env.creatorFeeBps();
  if (bps > 0 && (!global.creatorFeeConfigurable || global.maxConfigurableCreatorFeeBps.ltn(bps)))
    throw new HttpError(503, `pump.fun does not currently accept a ${bps} bps creator fee`);
  const creatorFeeBps = bps > 0 ? new BN(bps) : undefined;
  const common = {
    mint: input.mint,
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    creator: input.creator,
    user: input.user,
    mayhemMode: false,
    quoteMint: quote.mint,
    quoteTokenProgram: quote.quoteTokenProgram,
    creatorFeeBps,
  };

  if (input.quoteAmount.isZero()) return [await PUMP_SDK.createV2Instruction(common)];

  const [feeConfig, quoteControl, quoteTransferFee] = await Promise.all([
    sdk.fetchFeeConfig(),
    sdk.fetchQuoteControl(),
    sdk.fetchQuoteTransferFee(quote.mint),
  ]);
  const amount = getBuyTokenAmountFromSolAmount({
    global,
    feeConfig,
    mintSupply: null,
    bondingCurve: null,
    amount: input.quoteAmount,
    quoteMint: quote.mint,
    quoteControl,
    creatorFeeBps,
    quoteTransferFee,
  });
  return PUMP_SDK.createV2AndBuyV2Instructions({ ...common, global, amount, quoteAmount: input.quoteAmount, slippage: 1 });
}

export function feeVault(creator: PublicKey): string {
  return creatorVaultPda(creator).toBase58();
}

export type LiveState = {
  /** Unswept creator fees in raw quote units: both vaults plus whatever v3 trades left on the curve. */
  unsweptQuote: bigint;
  /** Market cap in raw quote units, from the curve's reserves. */
  marketCapQuote: bigint | null;
  curveCreatorFee: bigint;
  quoteMint: PublicKey;
};

export async function liveState(mint: PublicKey, creator: PublicKey): Promise<LiveState> {
  const sdk = pump();
  const curve = await sdk.fetchBondingCurve(mint);
  const quote = curve.quoteMint;
  const balances = await sdk.getCreatorVaultQuoteBalances(creator, [quote]);
  const vault = balances.find((b) => b.mint.equals(quote))?.total ?? new BN(0);
  const curveCreatorFee = BigInt(curve.creatorFee.toString());
  const marketCap = curve.virtualTokenReserves.isZero()
    ? null
    : bondingCurveMarketCap({
        mintSupply: curve.tokenTotalSupply,
        virtualQuoteReserves: curve.virtualQuoteReserves,
        virtualTokenReserves: curve.virtualTokenReserves,
      });
  return {
    unsweptQuote: BigInt(vault.toString()) + curveCreatorFee,
    marketCapQuote: marketCap ? BigInt(marketCap.toString()) : null,
    curveCreatorFee,
    quoteMint: quote,
  };
}

/** What the creator's vaults (curve + AMM) hold in the configured quote mint, raw units. */
export async function vaultBalance(creator: PublicKey): Promise<bigint> {
  const quote = await quoteMint();
  const balances = await pump().getCreatorVaultQuoteBalances(creator, [quote.mint]);
  return BigInt((balances.find((b) => b.mint.equals(quote.mint))?.total ?? new BN(0)).toString());
}
