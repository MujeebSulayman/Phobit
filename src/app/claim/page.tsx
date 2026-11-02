"use client";

import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { VirtualCardView } from "@/components/claim/VirtualCardView";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";
import { PhoneInput } from "@/components/PhoneInput";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { StageTrack } from "@/components/ui/StageTrack";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { parseContact } from "@/lib/contact";
import { formatCents, formatSol, ipfsImage, timeAgo } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import type { RecipientDashboard } from "@/lib/types";

type Step = "identify" | "code" | "claim";

const ISSUE_STEPS = ["Verifying your number", "Issuing virtual Visa", "Enabling Apple Pay", "Linking fee vaults"];

function StepIndicator({ step }: { step: Step }) {
  const labels = ["Phone", "Code", "Card"];
  const current = step === "identify" ? 0 : step === "code" ? 1 : 2;
  return (
    <ol className="flex items-center gap-2 text-[12px]">
      {labels.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${
              i < current
                ? "border-green bg-green text-black"
                : i === current
                  ? "border-fg text-fg"
                  : "border-line-strong text-fg-3"
            }`}
          >
            {i < current ? <Icons.Check width={11} height={11} strokeWidth={3} /> : i + 1}
          </span>
          <span className={i <= current ? "text-fg-2" : "text-fg-3"}>{label}</span>
          {i < labels.length - 1 && <span className="h-px w-6 bg-line-strong" />}
        </li>
      ))}
    </ol>
  );
}

export default function ClaimPage() {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState<Step>("identify");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecipientDashboard | null>(null);
  const [issuingStep, setIssuingStep] = useState(-1);
  const [addingToWallet, setAddingToWallet] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        setStep("claim");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setStep("claim");
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" }),
    [session],
  );

  const refresh = useCallback(async () => {
    if (!session) return;
    const res = await fetch("/api/recipients", { headers: headers() }).then((r) => r.json());
    if (!res.error) setData(res);
  }, [session, headers]);

  async function sendCode() {
    const parsed = parseContact("phone", phone);
    if ("error" in parsed) return setError(parsed.error);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: parsed.contact });
    setBusy(false);
    if (error) return setError(error.message);
    setStep("code");
  }

  async function verifyCode() {
    const parsed = parseContact("phone", phone);
    if ("error" in parsed) return setError(parsed.error);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone: parsed.contact, token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) return setError(error.message);
    // onAuthStateChange moves us to the "claim" step.
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setData(null);
    setStep("identify");
    setCode("");
  }

  async function issueCard() {
    setError(null);
    for (let i = 0; i < ISSUE_STEPS.length; i++) {
      setIssuingStep(i);
      await new Promise((r) => setTimeout(r, i === 1 ? 1100 : 750));
    }
    const res = await fetch("/api/card", { method: "POST", headers: headers() });
    setIssuingStep(-1);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Could not issue card");
    await refresh();
  }

  async function addToWallet() {
    setAddingToWallet(true);
    await new Promise((r) => setTimeout(r, 1400));
    await fetch("/api/card", { method: "PATCH", headers: headers(), body: JSON.stringify({ walletAdded: true }) });
    setAddingToWallet(false);
    await refresh();
  }

  async function removeCard() {
    await fetch("/api/recipients", { method: "DELETE", headers: headers() });
    refresh();
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (step !== "claim") return;
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [step, refresh]);

  const card = data?.recipient?.card ?? null;
  const active = !!(data?.recipient && data.recipient.status === "active");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <h1 className="text-[34px] font-semibold leading-none tracking-[-0.035em]">Claim fees</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fg-2">
          Someone launched a coin and pointed its creator fees at your phone number. Verify it, set up your Debit card,
          and every sweep lands there in USD.
        </p>
      </div>

      {step !== "claim" && (
        <div className="card mt-10 p-7">
          <StepIndicator step={step} />

          {step === "identify" && (
            <div className="mt-6">
              <label className="label" htmlFor="recipient">
                Your phone number
              </label>
              <PhoneInput value={phone} onValue={setPhone} autoFocus />
              <p className="mt-2 text-[12px] text-fg-3">We&apos;ll text you a 6-digit code.</p>
              {error && <p className="mt-3 text-[13px] text-red">{error}</p>}
              <button onClick={sendCode} disabled={busy || !phone} className="btn btn-primary mt-5 h-11 w-full">
                {busy ? "Sending…" : "Send code"}
              </button>
            </div>
          )}

          {step === "code" && (
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[13px] text-fg-2">
                  Code sent to <span className="font-mono text-fg">{phone}</span>
                </span>
                <button
                  onClick={() => {
                    setStep("identify");
                    setCode("");
                    setError(null);
                  }}
                  className="btn btn-ghost h-8 text-[12px]"
                >
                  Change
                </button>
              </div>
              <label className="label" htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                className="input text-center font-mono text-[20px] tracking-[0.4em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
              {error && <p className="mt-3 text-[13px] text-red">{error}</p>}
              <button onClick={verifyCode} disabled={busy || code.length < 6} className="btn btn-primary mt-5 h-11 w-full">
                {busy ? "Verifying…" : "Verify"}
              </button>
              <button onClick={sendCode} disabled={busy} className="btn btn-ghost mt-2 h-9 w-full text-[12px]">
                Resend code
              </button>
            </div>
          )}
        </div>
      )}

      {step === "claim" && session && (
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-green/15 text-green">
                <Icons.Check width={16} height={16} />
              </span>
              <div>
                <div className="font-mono text-[14px] font-medium">{data?.me.masked ?? "Verified"}</div>
                <div className="text-[12px] text-fg-3">
                  {data ? `${data.coins.length} coin${data.coins.length === 1 ? "" : "s"} route fees here` : "Verified"}
                </div>
              </div>
            </div>
            <button onClick={signOut} className="btn btn-ghost h-8 text-[12px]">
              Sign out
            </button>
          </div>

          {!data ? (
            <div className="skeleton h-72 rounded-[22px]" />
          ) : active ? (
            <>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div className="card p-5">
                  {card ? (
                    <VirtualCardView card={card} onAddToWallet={addToWallet} adding={addingToWallet} />
                  ) : (
                    <div className="rounded-2xl border border-line bg-gradient-to-br from-[#1c1c1f] to-[#0e0e10] p-5">
                      <div className="flex items-center justify-between">
                        <Icons.Apple width={24} height={24} />
                        <span className="text-[11px] uppercase tracking-wider text-fg-3">Debit</span>
                      </div>
                      <div className="mt-8 text-[15px] font-medium">
                        {data.recipient?.card_display_name ?? "Apple Pay card"}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card flex flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Receiving</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-green">
                      <span className="live-dot h-1.5 w-1.5 rounded-full bg-green" /> Active
                    </span>
                  </div>
                  <div className="mt-3 text-[12px] text-fg-3">Settled to card</div>
                  <div className="mt-1 text-[36px] font-semibold tracking-[-0.035em]">
                    <RollingNumber value={formatCents(data.totals.settledCents)} delay={0.1} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                    <div className="rounded-xl border border-line bg-bg-elev px-3 py-2.5">
                      <div className="text-fg-3">In flight</div>
                      <div className="mt-0.5 text-[15px] font-medium text-blue">
                        {formatCents(data.totals.inFlightCents)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-line bg-bg-elev px-3 py-2.5">
                      <div className="text-fg-3">Payouts</div>
                      <div className="mt-0.5 text-[15px] font-medium">{data.totals.count}</div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 text-[12px] text-fg-3">
                    <span>Sweeps every 10 min · USDC → USD</span>
                    <button onClick={removeCard} className="hover:text-red">
                      Remove card
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between px-5 py-4">
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Payouts</h2>
                  <span className="text-[12px] text-fg-3">Swept → USDC → Bridging → Settled</span>
                </div>
                {data.payouts.length === 0 ? (
                  <div className="border-t border-line px-6 py-12 text-center text-[13px] text-fg-3">
                    No sweeps yet. The first one lands as soon as a coin pointed at you accrues 0.005 SOL in fees.
                  </div>
                ) : (
                  <ul className="divide-y divide-line border-t border-line">
                    {data.payouts.map((p, i) => {
                      const img = ipfsImage(p.coin?.image_url, 72);
                      return (
                        <motion.li
                          key={p.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.04 * i, ease: EASE }}
                          className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3.5 sm:grid-cols-[1fr_200px_110px_auto]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-card-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium">
                                {p.coin?.name ?? p.mint.slice(0, 6)} <span className="text-fg-3">${p.coin?.symbol}</span>
                              </span>
                              <span className="block text-[12px] text-fg-3">
                                {formatSol(p.lamports)}
                                {p.usdc_amount != null && <> → {p.usdc_amount.toFixed(2)} USDC</>} · {timeAgo(p.created_at)}{" "}
                                ago
                                {p.sweep_signature && (
                                  <>
                                    {" · "}
                                    <a
                                      className="hover:underline"
                                      href={`https://solscan.io/tx/${p.sweep_signature}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      tx
                                    </a>
                                  </>
                                )}
                              </span>
                            </span>
                          </div>
                          <div className="hidden sm:block">
                            <StageTrack status={p.status} compact />
                          </div>
                          <div className="hidden text-right text-[14px] font-medium tabular-nums sm:block">
                            {formatCents(p.usd_cents)}
                          </div>
                          <StatusBadge status={p.status} />
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {data.coins.length > 0 && (
                <div className="card">
                  <div className="px-5 py-4">
                    <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Coins paying you</h2>
                  </div>
                  <div className="divide-y divide-line border-t border-line">
                    {data.coins.map((c) => {
                      const img = ipfsImage(c.image_url, 72);
                      return (
                        <Link
                          key={c.mint}
                          href={`/coin/${c.mint}`}
                          className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-card-2 cursor-pointer"
                        >
                          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-card-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium">
                              {c.name} <span className="text-fg-3">${c.symbol}</span>
                            </span>
                            <span className="block text-[12px] text-fg-3">
                              Swept so far · {formatSol(c.fees_swept_lamports)}
                            </span>
                          </span>
                          <Icons.Arrow width={14} height={14} className="text-fg-3" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-7">
              <div className="eyebrow">Step 3 of 3</div>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Set up your Debit card</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-fg-2">
                We issue you a virtual Visa debit card. Swept fees are converted to USDC, bridged, and settled onto it — and
                you can add it to Apple Wallet to spend instantly.
              </p>
              {data.totals.waitingCents > 0 && (
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3">
                  <div>
                    <div className="text-[14px] font-medium text-amber">
                      {formatCents(data.totals.waitingCents)} waiting for you
                    </div>
                    <div className="text-[12px] text-amber/80">Released to your card the moment it&apos;s issued.</div>
                  </div>
                  <StatusBadge status="unrouted" />
                </div>
              )}
              <div className="mt-6">
                <AnimatePresence mode="wait">
                  {issuingStep >= 0 ? (
                    <motion.ul
                      key="issuing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-2.5"
                    >
                      {ISSUE_STEPS.map((label, i) => {
                        const done = i < issuingStep;
                        const current = i === issuingStep;
                        return (
                          <li key={label} className="flex items-center gap-3 text-[13.5px]">
                            <span
                              className={`grid h-5 w-5 place-items-center rounded-full border transition-colors ${
                                done ? "border-green bg-green text-black" : current ? "border-fg" : "border-line-strong"
                              }`}
                            >
                              {done ? (
                                <Icons.Check width={11} height={11} strokeWidth={3} />
                              ) : current ? (
                                <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-fg/30 border-t-fg" />
                              ) : null}
                            </span>
                            <span className={done ? "text-fg" : current ? "text-fg-2" : "text-fg-3"}>
                              {label}
                              {current ? "…" : ""}
                            </span>
                          </li>
                        );
                      })}
                    </motion.ul>
                  ) : (
                    <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button onClick={issueCard} className="btn btn-apple w-full">
                        <Icons.Apple width={18} height={18} /> Create my Debit card
                      </button>
                      <p className="mt-3 text-center text-[12px] leading-relaxed text-fg-3">
                        Takes a few seconds. No credit check, no account, nothing to download.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {error && <p className="mt-3 text-center text-[13px] text-red">{error}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
