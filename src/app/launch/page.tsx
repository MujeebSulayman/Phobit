"use client";

import { VersionedTransaction } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";
import { PhoneInput } from "@/components/PhoneInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { maskContact, parseContact } from "@/lib/contact";
import { fromBase64, shortAddress, toBase64 } from "@/lib/format";
import { useWallet } from "@/lib/useWallet";

type Stage = "idle" | "pinning" | "swapping" | "building" | "signing" | "sending" | "done";

const STAGES: Stage[] = ["pinning", "swapping", "building", "signing", "sending"];

const STAGE_LABEL: Record<Stage, string> = {
  idle: "Launch coin",
  pinning: "Uploading metadata",
  swapping: "Swapping SOL → AAPLx",
  building: "Building transaction",
  signing: "Confirm in wallet",
  sending: "Broadcasting",
  done: "Launched",
};

const NETWORK_FEE_SOL = 0.02;

function Section({
  n,
  title,
  hint,
  optional,
  children,
}: {
  n: string;
  title: string;
  hint: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-5 p-6 sm:grid-cols-[220px_1fr] sm:gap-8 sm:p-7">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-fg-3">{n}</span>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          {optional && (
            <span className="rounded-full border border-line px-1.5 py-px text-[10px] uppercase tracking-wider text-fg-3">
              Optional
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-3">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  optional,
  count,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  count?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label mb-0" htmlFor={htmlFor}>
          {label}
          {optional && <span className="text-fg-3"> · optional</span>}
        </label>
        {count && <span className="font-mono text-[10.5px] text-fg-3">{count}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <span className="text-fg-3">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function Stepper({ stage, skipSwap }: { stage: Stage; skipSwap: boolean }) {
  const stages = skipSwap ? STAGES.filter((s) => s !== "swapping") : STAGES;
  const current = stages.indexOf(stage);
  const finished = stage === "done";
  return (
    <ul className="mb-1 flex flex-col gap-2">
      {stages.map((s, i) => {
        const state = finished || i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={s} className="flex items-center gap-2.5 text-[12.5px]">
            <motion.span
              animate={{ scale: state === "active" ? 1.1 : 1 }}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] transition-colors ${
                state === "done"
                  ? "border-green bg-green text-black"
                  : state === "active"
                    ? "border-fg text-fg"
                    : "border-line-strong text-fg-3"
              }`}
            >
              {state === "done" ? (
                <Icons.Check width={11} height={11} strokeWidth={3} />
              ) : state === "active" ? (
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-fg/30 border-t-fg" />
              ) : (
                i + 1
              )}
            </motion.span>
            <span className={state === "todo" ? "text-fg-3" : "text-fg-2"}>{STAGE_LABEL[s]}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />;
}

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error ?? fallback);
}

export default function LaunchPage() {
  const router = useRouter();
  const { address, connected, connect, signTransaction } = useWallet();
  const fileRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");
  const [devBuy, setDevBuy] = useState("");
  const [recipient, setRecipient] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  function pickImage(file: File | undefined | null) {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const parsedRecipient = recipient.trim() ? parseContact("phone", recipient) : null;
  const recipientOk = parsedRecipient != null && !("error" in parsedRecipient);
  const busy = stage !== "idle" && stage !== "done";
  const devBuySol = Number(devBuy || 0);
  const hasDevBuy = devBuySol > 0;
  const ready = !!(
    image &&
    name.trim() &&
    symbol.trim() &&
    connected &&
    recipientOk &&
    Number.isFinite(devBuySol) &&
    devBuySol >= 0
  );

  const missing: string[] = [];
  if (!image) missing.push("image");
  if (!name.trim()) missing.push("name");
  if (!symbol.trim()) missing.push("symbol");
  if (!recipientOk) missing.push("recipient");

  async function launch() {
    if (!ready || !address || !image) return;
    setError(null);
    try {
      // 1. Pin image + metadata to IPFS.
      setStage("pinning");
      const form = new FormData();
      form.append("image", image);
      form.append("name", name.trim());
      form.append("symbol", symbol.trim().toUpperCase());
      form.append("description", description.trim());
      form.append("twitter", twitter.trim());
      form.append("website", website.trim());
      const upload = await fetch("/api/upload", { method: "POST", body: form });
      if (!upload.ok) throw await errorFrom(upload, "Upload failed");
      const { uri, image: imageUri } = await upload.json();

      // 2. Optional dev buy: swap SOL → AAPLx first (separate signature).
      let quoteAmount = "0";
      if (hasDevBuy) {
        setStage("swapping");
        const build = await fetch("/api/launch/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: address, solAmount: devBuySol }),
        });
        if (!build.ok) throw await errorFrom(build, "Could not build the swap");
        const { transaction } = await build.json();
        const signed = await signTransaction(VersionedTransaction.deserialize(fromBase64(transaction)));
        const send = await fetch("/api/launch/swap", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: address, signedTransaction: toBase64(signed.serialize()) }),
        });
        if (!send.ok) throw await errorFrom(send, "Swap failed");
        quoteAmount = (await send.json()).aaplx;
      }

      // 3. Build the create (+ buy) transaction.
      setStage("building");
      const prepare = await fetch("/api/launch/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          uri,
          image: imageUri,
          user: address,
          quoteAmount,
          devBuySol,
          twitter: twitter.trim(),
          website: website.trim(),
          recipient: { kind: "phone", value: recipient },
        }),
      });
      if (!prepare.ok) throw await errorFrom(prepare, "Could not build transaction");
      const { mint, transaction } = await prepare.json();

      // 4. Sign and broadcast.
      setStage("signing");
      const signed = await signTransaction(VersionedTransaction.deserialize(fromBase64(transaction)));
      setStage("sending");
      const submit = await fetch("/api/launch/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint, signedTransaction: toBase64(signed.serialize()) }),
      });
      if (!submit.ok) throw await errorFrom(submit, "Launch failed");

      setStage("done");
      router.push(`/coin/${mint}`);
    } catch (e) {
      setStage("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const recipientState = parsedRecipient && "error" in parsedRecipient ? "err" : recipientOk ? "ok" : "idle";

  return (
    <div>
      <PageHeader
        title="Launch a coin"
        subtitle="Mint on pump.fun, paired with tokenized Apple stock, and choose who receives its 3% creator fee."
        right={
          <span className="hidden items-center gap-2 text-[12px] text-fg-3 sm:inline-flex">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-green" /> pump.fun · Solana mainnet
          </span>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="card divide-y divide-line lg:self-start">
          <Section
            n="01"
            title="Token"
            hint="What traders see on pump.fun, explorers and wallets. The image and metadata are pinned to IPFS and can't be edited after launch."
          >
            <div className="grid gap-5 sm:grid-cols-[128px_1fr]">
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickImage(e.dataTransfer.files[0]);
                  }}
                  className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-dashed border-line-strong bg-bg-elev transition-colors hover:border-fg-3 cursor-pointer"
                >
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center text-[12px] text-fg-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-card-2 text-fg-2 transition-colors group-hover:text-fg">
                        <Icons.Launch width={16} height={16} />
                      </span>
                      Upload image
                    </span>
                  )}
                  {preview && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[11px] text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                      Replace
                    </span>
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] text-fg-3">PNG, JPG, WebP, GIF · ≤ 5 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
              </div>

              <div className="grid content-start gap-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_132px]">
                  <Field label="Name" htmlFor="name" count={`${name.length}/32`}>
                    <input
                      id="name"
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={32}
                      placeholder="My Token"
                    />
                  </Field>
                  <Field label="Symbol" htmlFor="symbol" count={`${symbol.length}/10`}>
                    <input
                      id="symbol"
                      className="input uppercase"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                      maxLength={10}
                      placeholder="TOKEN"
                    />
                  </Field>
                </div>
                <Field label="Description" htmlFor="desc" optional count={`${description.length}/500`}>
                  <textarea
                    id="desc"
                    className="input"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    placeholder="One or two sentences about the coin."
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section
            n="02"
            title="Fee recipient"
            hint="Every trade pays a 3% creator fee, in AAPLx, into this coin's own vault. Enter the phone number of the person who should receive it. They verify it once with a texted code, create their Debit card, and get paid in USD on every sweep."
          >
            <Field label="Phone number" htmlFor="recipient">
              <PhoneInput value={recipient} onValue={setRecipient} />
            </Field>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={recipientState}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={`mt-2.5 flex items-start gap-2 text-[12.5px] leading-relaxed ${
                  recipientState === "err" ? "text-amber" : "text-fg-3"
                }`}
              >
                {parsedRecipient && "error" in parsedRecipient ? (
                  parsedRecipient.error
                ) : parsedRecipient && recipientOk ? (
                  <>
                    <Icons.Check width={14} height={14} className="mt-0.5 shrink-0 text-green" />
                    <span>
                      Fees will be held for{" "}
                      <span className="text-fg-2">{maskContact(parsedRecipient.kind, parsedRecipient.contact)}</span> until
                      they claim.
                    </span>
                  </>
                ) : (
                  <>
                    <Icons.Apple width={14} height={14} className="mt-0.5 shrink-0" />
                    <span>Can be you, a friend, or a creator you want to support. They&apos;ll get a text to claim.</span>
                  </>
                )}
              </motion.p>
            </AnimatePresence>
          </Section>

          <Section
            n="03"
            title="Links"
            hint="Optional. Shown on the coin page and embedded in the on-chain metadata."
            optional
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="X / Twitter" htmlFor="tw">
                <input
                  id="tw"
                  className="input"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://x.com/…"
                />
              </Field>
              <Field label="Website" htmlFor="web">
                <input
                  id="web"
                  className="input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </Field>
            </div>
          </Section>

          <Section
            n="04"
            title="Initial buy"
            hint="Optional. Pay in SOL — we swap it to AAPLx in your wallet, then buy from the fresh curve in the launch transaction so you hold supply before anyone else can. Two signatures instead of one."
            optional
          >
            <Field label="Amount" htmlFor="dev">
              <div className="relative">
                <input
                  id="dev"
                  className="input pr-14 tabular-nums"
                  inputMode="decimal"
                  value={devBuy}
                  onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0.00"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-fg-3">SOL</span>
              </div>
            </Field>
          </Section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="relative aspect-[4/3] bg-card-2">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-[40px] font-semibold text-fg-3">
                  {symbol.slice(0, 2).toUpperCase() || "—"}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
                <div className="truncate text-[17px] font-semibold">{name.trim() || "Coin name"}</div>
                <div className="text-[12px] text-white/60">${symbol.toUpperCase() || "SYMBOL"} / AAPLx · pump.fun</div>
              </div>
            </div>

            <div className="divide-y divide-line text-[13px]">
              <Row
                k="Launcher"
                v={
                  address ? (
                    <span className="font-mono text-[12px]">{shortAddress(address, 6)}</span>
                  ) : (
                    <span className="text-fg-3">Not connected</span>
                  )
                }
              />
              <Row
                k="Fees to"
                v={
                  parsedRecipient && recipientOk ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icons.Apple width={13} height={13} /> {maskContact(parsedRecipient.kind, parsedRecipient.contact)}
                    </span>
                  ) : (
                    <span className="text-fg-3">—</span>
                  )
                }
              />
              <Row
                k="Quoted in"
                v={
                  <span className="inline-flex items-center gap-1.5">
                    <Icons.Apple width={13} height={13} /> AAPLx · tokenized Apple stock
                  </span>
                }
              />
              <Row k="Creator fee" v="3% of every trade" />
              <Row k="Initial buy" v={hasDevBuy ? `${devBuySol} SOL → AAPLx` : <span className="text-fg-3">None</span>} />
              <Row k="Network fee" v={`≈ ${NETWORK_FEE_SOL} SOL`} />
              <Row
                k="You sign"
                v={
                  <span className="font-medium">
                    {(devBuySol + NETWORK_FEE_SOL).toFixed(2)} SOL
                    {hasDevBuy && <span className="text-fg-3"> · 2 signatures</span>}
                  </span>
                }
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-line p-5">
              <AnimatePresence initial={false}>
                {(busy || stage === "done") && (
                  <motion.div
                    key="stepper"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <Stepper stage={stage} skipSwap={!hasDevBuy} />
                  </motion.div>
                )}
                {error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-xl border border-red/30 bg-red/10 px-3.5 py-2.5 text-[12.5px] text-red"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {connected ? (
                <button onClick={launch} disabled={!ready || busy} className="btn btn-primary h-11 w-full">
                  {busy && <Spinner />} {STAGE_LABEL[stage]}
                  {busy && "…"}
                </button>
              ) : (
                <button onClick={connect} className="btn btn-primary h-11 w-full">
                  Connect wallet
                </button>
              )}
              <p className="text-center text-[12px] text-fg-3">
                {connected && !ready && !busy && missing.length > 0
                  ? `Add ${missing.join(", ")} to launch.`
                  : hasDevBuy
                    ? "Two signatures: the swap, then the launch. The mint is permanent."
                    : "One signature. The mint is permanent."}
              </p>
            </div>
          </div>

          <div className="card p-5">
            <div className="eyebrow">After launch</div>
            <ol className="mt-3 flex flex-col gap-3 text-[13px] leading-relaxed text-fg-2">
              <li className="flex gap-3">
                <span className="text-fg-3">1</span> The coin is live on pump.fun and on your Debit coin page.
              </li>
              <li className="flex gap-3">
                <span className="text-fg-3">2</span> Every trade pays 3% in AAPLx into the coin&apos;s vault. Our keeper
                sweeps it and converts it to USDC.
              </li>
              <li className="flex gap-3">
                <span className="text-fg-3">3</span> The recipient verifies their number once; every sweep after that lands
                on their card in USD.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
