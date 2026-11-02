import "server-only";
import { NotFoundError, PrivyClient, type User } from "@privy-io/node";
import { VersionedTransaction } from "@solana/web3.js";
import { env } from "./env";

let client: PrivyClient | null = null;
export function privy(): PrivyClient {
  client ??= new PrivyClient({ appId: env.privyAppId(), appSecret: env.privyAppSecret() });
  return client;
}

export type RecipientWallet = { privyUserId: string; walletId: string; address: string };

type EmbeddedSolana = { type: "wallet"; chain_type: "solana"; connector_type: "embedded"; id: string | null; address: string };

export function embeddedSolanaWallet(user: User): { id: string; address: string } | null {
  const w = user.linked_accounts.find(
    (a): a is typeof a & EmbeddedSolana =>
      a.type === "wallet" && "chain_type" in a && a.chain_type === "solana" && "connector_type" in a && a.connector_type === "embedded",
  );
  return w?.id ? { id: w.id, address: w.address } : null;
}

export function phoneNumber(user: User): string | null {
  const p = user.linked_accounts.find((a) => a.type === "phone") as { phoneNumber?: string; number?: string } | undefined;
  const raw = p?.phoneNumber ?? p?.number;
  return raw ? `+${raw.replace(/\D/g, "")}` : null;
}

function walletSpec() {
  const policy = env.privyPolicyId();
  return {
    chain_type: "solana" as const,
    additional_signers: [{ signer_id: env.privySignerId(), ...(policy ? { override_policy_ids: [policy] } : {}) }],
  };
}

/**
 * The Privy user and Solana wallet for a phone number, created before the person ever signs in.
 * When they later log in with that number and the SMS code, Privy hands them this same wallet.
 */
export async function walletForPhone(e164: string): Promise<RecipientWallet> {
  let user: User;
  try {
    user = await privy().users().getByPhoneNumber({ number: e164 });
  } catch (e) {
    if (!(e instanceof NotFoundError)) throw e;
    user = await privy().users().create({ linked_accounts: [{ type: "phone", number: e164 }], wallets: [walletSpec()] });
  }
  let wallet = embeddedSolanaWallet(user);
  if (!wallet) {
    user = await privy().users().pregenerateWallets(user.id, { wallets: [walletSpec()] });
    wallet = embeddedSolanaWallet(user);
  }
  if (!wallet) throw new Error(`Privy did not return a Solana wallet for user ${user.id}`);
  return { privyUserId: user.id, walletId: wallet.id, address: wallet.address };
}

/** Whether our server signer is on the wallet (it is when we created it, or after the user opts in). */
export async function hasServerSigner(walletId: string): Promise<boolean> {
  const wallet = await privy().wallets().get(walletId);
  return (wallet.additional_signers ?? []).some((s) => s.signer_id === env.privySignerId());
}

/** Adds the recipient wallet's signature through Privy, as our server signer. Other signatures are kept. */
export async function signAsWallet(walletId: string, tx: VersionedTransaction): Promise<VersionedTransaction> {
  const res = await privy()
    .wallets()
    .solana()
    .signTransaction(walletId, {
      transaction: tx.serialize(),
      authorization_context: { authorization_private_keys: [env.privyAuthorizationKey()] },
    });
  return VersionedTransaction.deserialize(Buffer.from(res.signed_transaction, "base64"));
}
