"use client";

import { useSigners } from "@privy-io/react-auth";
import { useExportWallet, useSignTransaction, useWallets } from "@privy-io/react-auth/solana";
import { VersionedTransaction } from "@solana/web3.js";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { formatCents, fromBase64, shortAddress, toBase64 } from "@/lib/format";
import type { RecipientWallet, WithdrawBuildResponse } from "@/lib/types";

const SIGNER_ID = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID ?? "";
const POLICY_ID = process.env.NEXT_PUBLIC_PRIVY_POLICY_ID ?? "";

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error ?? fallback);
}

/**
 * The recipient's own Solana wallet, created for their phone number when a coin first named it.
 * Fees are collected into it and converted to USDC; from here they can withdraw or export the key.
 */
export function WalletPanel({
  wallet,
  headers,
  onChange,
}: {
  wallet: RecipientWallet;
  headers: () => Promise<Record<string, string>>;
  onChange: () => void;
}) {
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { addSigners } = useSigners();
  const { exportWallet } = useExportWallet();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<null | "withdraw" | "signer">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const embedded = wallets.find((w) => w.address === wallet.address) ?? null;

  async function enableAutoPayouts() {
    setBusy("signer");
    setError(null);
    try {
      await addSigners({
        address: wallet.address,
        signers: [{ signerId: SIGNER_ID, ...(POLICY_ID ? { policyIds: [POLICY_ID] } : {}) }],
      });
      const res = await fetch("/api/wallet/signer", { method: "POST", headers: await headers() });
      if (!res.ok) throw await errorFrom(res, "Could not turn on automatic payouts");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn on automatic payouts");
    } finally {
      setBusy(null);
    }
  }

  async function withdraw() {
    if (!embedded) return setError("Your wallet is still loading, try again in a moment");
    setBusy("withdraw");
    setError(null);
    setNotice(null);
    try {
      const build = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ to: to.trim(), amount: Number(amount) }),
      });
      if (!build.ok) throw await errorFrom(build, "Could not build the withdrawal");
      const { transaction } = (await build.json()) as WithdrawBuildResponse;
      const { signedTransaction } = await signTransaction({ transaction: fromBase64(transaction), wallet: embedded });
      const send = await fetch("/api/wallet/withdraw", {
        method: "PUT",
        headers: await headers(),
        body: JSON.stringify({ signedTransaction: toBase64(VersionedTransaction.deserialize(signedTransaction).serialize()) }),
      });
      if (!send.ok) throw await errorFrom(send, "Withdrawal failed");
      setNotice(`Sent ${Number(amount).toLocaleString("en-US")} USDC to ${shortAddress(to.trim())}`);
      setTo("");
      setAmount("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setBusy(null);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(wallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const usdc = wallet.usdcCents / 100;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Your wallet</span>
        <button onClick={copy} className="flex items-center gap-1.5 font-mono text-[12px] text-fg-3 hover:text-fg">
          <Icons.Wallet width={13} height={13} />
          {copied ? "Copied" : shortAddress(wallet.address, 6)}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
        <div className="rounded-xl border border-line bg-bg-elev px-3 py-2.5">
          <div className="text-fg-3">USDC balance</div>
          <div className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em]">{formatCents(wallet.usdcCents)}</div>
        </div>
        <div className="rounded-xl border border-line bg-bg-elev px-3 py-2.5">
          <div className="text-fg-3">Fees not yet collected</div>
          <div className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em]">{formatCents(wallet.unclaimedCents)}</div>
        </div>
      </div>

      {!wallet.autoPayouts && (
        <div className="mt-4 rounded-xl border border-amber/25 bg-amber/10 px-4 py-3 text-[12.5px]">
          <div className="font-medium text-amber">Automatic payouts are off</div>
          <div className="mt-0.5 text-amber/80">
            Your fees are safe in your wallet&apos;s fee vault. Allow Phobit to collect them and convert them to USDC for
            you — it can only do that, and you can revoke it any time.
          </div>
          <button onClick={enableAutoPayouts} disabled={busy !== null} className="btn btn-secondary mt-3 h-9 text-[12px]">
            {busy === "signer" ? "Confirming…" : "Turn on automatic payouts"}
          </button>
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <div className="label">Withdraw USDC</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
          <input
            className="input font-mono"
            placeholder="Solana address"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            spellCheck={false}
          />
          <input
            className="input"
            placeholder="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <button
            onClick={withdraw}
            disabled={busy !== null || !to.trim() || !(Number(amount) > 0)}
            className="btn btn-primary h-11"
          >
            {busy === "withdraw" ? "Sending…" : "Send"}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-fg-3">
          <button onClick={() => setAmount(String(usdc))} className="hover:text-fg" disabled={usdc <= 0}>
            Max {usdc.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC
          </button>
          <button onClick={() => exportWallet({ address: wallet.address })} className="hover:text-fg">
            Export private key
          </button>
        </div>
        {error && <p className="mt-3 text-[12.5px] text-red">{error}</p>}
        {notice && <p className="mt-3 text-[12.5px] text-green">{notice}</p>}
      </div>
    </div>
  );
}
