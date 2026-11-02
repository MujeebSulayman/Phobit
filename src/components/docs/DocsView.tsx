"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icons } from "@/components/icons";
import { EASE } from "@/components/motion";

type TocEntry = { id: string; title: string; group?: string };

const SECTIONS: TocEntry[] = [
  { id: "overview", title: "Overview", group: "Start here" },
  { id: "how-it-works", title: "How it works" },
  { id: "quickstart", title: "Launch in two minutes" },
  { id: "recipients", title: "Recipients", group: "Fees" },
  { id: "claiming", title: "Claiming fees" },
  { id: "debit-card", title: "Your Phobit card" },
  { id: "fee-mechanics", title: "Fee mechanics" },
  { id: "attribution", title: "Per-coin attribution" },
  { id: "sweeping", title: "Sweeping, swapping & bridging" },
  { id: "payout-lifecycle", title: "Payout lifecycle" },
  { id: "pricing", title: "USD pricing" },
  { id: "security", title: "Security & privacy", group: "Trust" },
  { id: "limits", title: "Limits & regions" },
  { id: "api", title: "Public API", group: "Reference" },
  { id: "glossary", title: "Glossary" },
  { id: "faq", title: "FAQ" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <motion.section
      id={id}
      className="scroll-mt-28 border-t border-line pt-10 pb-14 first-of-type:border-t-0 first-of-type:pt-0"
      initial={{
        opacity: 0,
        y: 14,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-60px",
      }}
      transition={{
        duration: 0.5,
        ease: EASE,
      }}
    >
      <h2 className="mb-5 text-[26px] font-semibold tracking-[-0.025em]">
        <a href={`#${id}`} className="group">
          {title}
          <span className="ml-2 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100">#</span>
        </a>
      </h2>
      <div className="prose-debit">{children}</div>
    </motion.section>
  );
}

function Callout({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={`my-5 rounded-2xl border px-4 py-3.5 text-[13.5px] leading-relaxed ${tone === "warn" ? "border-amber/30 bg-amber/10 text-amber" : "border-line bg-card text-fg-2"}`}
    >
      {children}
    </div>
  );
}

function Steps({ items }: { items: [string, ReactNode][] }) {
  return (
    <ol className="!my-4 !list-none !pl-0">
      {items.map(([title, body], i) => (
        <li key={title} className="!mt-0 flex gap-4 border-l border-line pb-6 pl-5 last:pb-0">
          <span className="-ml-[29px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-line-strong bg-bg font-mono text-[10px] text-fg-2">
            {i + 1}
          </span>
          <div className="-mt-0.5">
            <div className="text-[14.5px] font-medium text-fg">{title}</div>
            <p className="!mt-1 text-[13.5px]">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-card">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-line">
              {row.map((cell, c) => (
                <td key={c} className={`px-4 py-3 align-top ${c === 0 ? "text-fg" : "text-fg-2"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line py-3.5 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-fg marker:hidden">
        {q}
        <span className="shrink-0 text-fg-3 transition-transform duration-300 group-open:rotate-45">
          <Icons.Launch width={16} height={16} />
        </span>
      </summary>
      <p className="!mt-2.5 pr-8 text-[14px]">{children}</p>
    </details>
  );
}

export function DocsView() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const ratios = useRef<Record<string, number>>({});

  // Highlight the TOC entry for whichever section is most visible.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          ratios.current[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
        const top = SECTIONS.map((s) => [s.id, ratios.current[s.id] ?? 0] as const).sort((a, b) => b[1] - a[1])[0];
        if (top && top[1] > 0) setActive(top[0]);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[232px_1fr]">
      <nav className="lg:sticky lg:top-24 lg:self-start">
        <div className="eyebrow mb-3 hidden lg:block">On this page</div>
        <ul className="-mx-1 flex gap-1 overflow-x-auto pb-2 lg:mx-0 lg:block lg:overflow-visible lg:pb-0">
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            return (
              <li key={s.id} className="shrink-0 lg:shrink">
                {s.group && (
                  <div className="mt-4 mb-1.5 hidden text-[10.5px] font-medium uppercase tracking-[0.1em] text-fg-3 first:mt-0 lg:block">
                    {s.group}
                  </div>
                )}
                <a
                  href={`#${s.id}`}
                  className={`relative block rounded-lg px-3 py-1.5 text-[13px] transition-colors lg:rounded-none lg:border-l lg:border-line lg:py-1.5 lg:pl-4 ${
                    isActive ? "text-fg bg-card-2 lg:bg-transparent" : "text-fg-3 hover:text-fg-2"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="toc-indicator"
                      className="absolute -left-px top-0 hidden h-full w-px bg-fg lg:block"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  )}
                  {s.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <article className="min-w-0 max-w-[720px]">
        <header className="mb-14">
          <div className="eyebrow">Documentation</div>
          <h1 className="brackets mt-5 font-display text-[44px] font-semibold leading-[0.95] tracking-[-0.045em] sm:text-[56px]">Phobit, <span className="text-iris">explained.</span></h1>
          <p className="mt-4 text-[17px] leading-relaxed text-fg-2">
            Everything about launching a coin on pump.fun through Phobit, how its creator fees are attributed, swept and
            priced, and how the person whose number you enter claims them to an Apple Pay card.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/launch" className="btn btn-primary h-9 px-4 text-[13px]">
              Launch coin
            </Link>
            <Link href="/claim" className="btn btn-secondary h-9 px-4 text-[13px]">
              Claim fees
            </Link>
          </div>
        </header>
        <Section id="overview" title="Overview">
          <p>
            {"Phobit is a launchpad for "}
            <a href="https://pump.fun" target="_blank" rel="noreferrer">
              pump.fun
            </a>
            {" coins with one change to the money flow: the "}
            <strong>creator fee</strong>
            {
              " a coin earns on every trade is paid, in US dollars, to a debit card in the Apple Wallet of whoever the launcher names — identified by phone number."
            }
          </p>
          <p>That means three roles instead of one:</p>
          <ul>
            <li>
              <strong>Launcher</strong>
              {
                " — connects a Solana wallet, fills in the coin, signs one transaction, pays the network fee. Never touches the fees. Every coin is paired with tokenized Apple stock (AAPLx) and charges a 3% creator fee."
              }
            </li>
            <li>
              <strong>Recipient</strong>
              {" — the person whose phone number the launcher entered. Claims once, then gets paid automatically."}
            </li>
            <li>
              <strong>Keeper</strong>
              {
                " — Phobit's scheduled job that collects fees from each coin's vault, converts them to USDC, bridges them, and settles dollars onto the recipient's card."
              }
            </li>
          </ul>
        </Section>
        <Section id="how-it-works" title="How it works">
          <Steps
            items={[
              [
                "Launch",
                "The launcher uploads an image, names the coin, and enters the recipient's phone number. We pin metadata to IPFS and build a create (+ optional buy) transaction with a per-coin fee vault.",
              ],
              [
                "Trade",
                "Every buy and sell on the AAPLx curve, and later on the pump AMM, pays a 3% creator fee — in AAPLx — into that coin's vault. The vault belongs to this coin alone.",
              ],
              [
                "Sweep",
                "The keeper checks vaults on a schedule. When one holds at least 0.005 SOL it collects the balance, swaps it to USDC, and records a payout for the recipient.",
              ],
              [
                "Claim",
                "The recipient opens Claim fees, verifies the number with a texted code, and creates their Phobit card — a virtual Visa they can add to Apple Wallet. Unclaimed payouts are released the moment the card exists.",
              ],
              [
                "Get paid",
                "Every payout is bridged from USDC to USD and settles on the card within minutes. The dashboard shows each one moving Swept → USDC → Bridging → Settled.",
              ],
            ]}
          />
        </Section>
        <Section id="quickstart" title="Launch in two minutes">
          <ol>
            <li>
              {"Open "}
              <Link href="/launch">Launch</Link>
              {" and connect a Solana wallet with at least the network fee (≈ 0.02 SOL) plus any initial buy."}
            </li>
            <li>
              Upload a square image (512 × 512 renders best everywhere) and enter a name (≤ 32 chars) and symbol (≤ 10).
            </li>
            <li>
              {"Under "}
              <em>Fee recipient</em>, pick the country and enter the phone number. It is stored as E.164 (
              <code>+14155550123</code>).
            </li>
            <li>Optionally add links. The coin is quoted in AAPLx with a 3% creator fee — both fixed.</li>
            <li>
              {"Press "}
              <em>Launch coin</em>. Your wallet asks for one signature. We broadcast through a dedicated RPC and
              redirect you to the coin page when it confirms.
            </li>
          </ol>
          <p>
            {"Tell the recipient to visit "}
            <code>phobit/claim</code>. They don't need a wallet, an account, or any crypto knowledge.
          </p>
        </Section>
        <Section id="recipients" title="Recipients">
          <p>
            {"A recipient is an identity, not an account: "}
            <code>phone:+14155550123</code>. Numbers are normalized to E.164 before storage so the same person typed two
            ways resolves to one recipient:
          </p>
          <Table
            head={["You type", "Stored as"]}
            rows={[
              ["(415) 555-0123", "phone:+14155550123"],
              ["+44 7700 900123", "phone:+447700900123"],
            ]}
          />
          <p>
            Several coins can point at the same recipient; they all pay into the same claim. The recipient can be the
            launcher, a friend, a creator you want to support, or anyone else — Phobit never contacts them on your
            behalf, so send them the claim link yourself.
          </p>
          <Callout tone="warn">
            Double-check the contact before launching. It is written into the coin at mint time and cannot be changed
            afterwards. Fees pointed at a typo are unclaimable.
          </Callout>
          <h3>Why not an X handle or a wallet?</h3>
          <p>
            {"A phone number is something the recipient can "}
            <em>prove</em>
            {
              " they own with a texted code, without any crypto setup. That proof is what lets us attach an Apple Pay card to the right person. A wallet would require the recipient to already be on-chain; a social handle has no verification path a bank will accept."
            }
          </p>
        </Section>
        <Section id="claiming" title="Claiming fees">
          <p>
            {"Go to "}
            <Link href="/claim">Claim fees</Link>.
          </p>
          <ol>
            <li>
              <strong>Identify.</strong>
              {" Pick your country and enter the phone number the launcher used."}
            </li>
            <li>
              <strong>Verify.</strong>
              {" Enter the 6-digit code we text you. Codes expire after a few minutes."}
            </li>
            <li>
              <strong>Create your card.</strong>
              {" Tap "}
              <em>Create my Phobit card</em>
              {
                ". We issue a virtual Visa debit card in a few seconds — number, expiry and CVV are yours to reveal and copy. Tap "
              }
              <em>Add to Apple Wallet</em>
              {" to pay with it anywhere Apple Pay is accepted."}
            </li>
          </ol>
          <p>
            The dashboard then shows your card, the total settled to it, what's in flight, and every payout with its
            stage. Returning later on the same device skips straight to the dashboard.
          </p>
          <p>
            {"You can remove the card at any time. Sweeps that arrive while you have no card wait as "}
            <em>Awaiting card</em>
            {" and are released when you create another."}
          </p>
        </Section>
        <Section id="debit-card" title="Your Phobit card">
          <p>
            {"Phobit issues every recipient a "}
            <strong>virtual Visa debit card</strong>
            {
              " at claim time. Settled payouts land on it as US dollars, and the card can be added to Apple Wallet so the money is spendable immediately — in stores, in apps and online — with Face ID."
            }
          </p>
          <h3>Card details</h3>
          <p>
            {"The card number, expiry and CVV are shown on your dashboard behind "}
            <em>Show details</em>, with one-tap copy. The card is debit, not credit: it only ever holds money that has
            already settled from your fee payouts. There is no credit check, no monthly fee, and no application.
          </p>
          <h3>Apple Wallet</h3>
          <ul>
            <li>
              <em>Add to Apple Wallet</em>
              {" provisions the card to your iPhone, Apple Watch and Mac."}
            </li>
            <li>The card works anywhere Visa is accepted; Apple Pay works anywhere contactless is accepted.</li>
            <li>
              {"Google Wallet provisioning is on the roadmap. See "}
              <a href="#limits">Limits & regions</a>.
            </li>
          </ul>
          <h3>Speed</h3>
          <p>
            From sweep to spendable balance is typically a few minutes: the swap to USDC confirms in seconds and the
            bridge settles shortly after. Each payout shows its stage live on the dashboard.
          </p>
        </Section>
        <Section id="fee-mechanics" title="Fee mechanics">
          <p>pump.fun charges fees on every trade. The schedule is set by the protocol, not by Phobit:</p>
          <Table
            head={["Leg", "Rate", "Goes to"]}
            rows={[
              ["Protocol fee", "~95 bps (dynamic by market cap and size)", "pump.fun, half to buyback"],
              ["Creator fee", "3% (300 bps) — the protocol maximum", "This coin's vault, in AAPLx → recipient"],
            ]}
          />
          <p>
            {"Every Phobit coin is "}
            <strong>quoted in AAPLx</strong>
            {
              " — tokenized Apple stock on Solana — so trades and fees are denominated in Apple shares rather than SOL. On a 1 AAPLx buy, 0.03 AAPLx lands in the creator vault. Fees continue after the curve completes: once the coin graduates to the pump AMM, swaps there pay the creator fee into a companion vault for the same key, and the keeper sweeps both."
            }
          </p>
          <p>
            Phobit takes nothing from the creator fee. Costs of converting to USD and pushing to a card are shown on each
            payout.
          </p>
        </Section>
        <Section id="attribution" title="Whose wallet the fees go to">
          <p>
            {"pump.fun pays creator fees into a vault keyed by the coin's "}
            <code>creator</code>
            {
              " public key. On Phobit, that creator is the recipient's own Solana wallet, created for their phone number at launch time — before they've ever signed up:"
            }
          </p>
          <pre>{`wallet  = privy_wallet_for(phone)   // created once per number
creator = wallet
vault   = creator_vault_pda(wallet)`}</pre>
          <ul>
            <li>When the recipient signs in with that number and the texted code, the wallet is theirs.</li>
            <li>The fees are never held by Phobit: they sit in the recipient&apos;s vault until collected into their wallet.</li>
            <li>
              Several coins naming the same number share one vault, so a payout can cover more than one coin. It&apos;s
              shown as &ldquo;Several coins&rdquo; in that case.
            </li>
          </ul>
          <p>
            {"You can see a coin's fee vault key on its coin page under "}
            <em>Fee routing</em>, and verify its balance on any Solana explorer.
          </p>
        </Section>
        <Section id="sweeping" title="Sweeping, swapping & bridging">
          <p>The keeper runs every 10 minutes. For each recipient who has turned on automatic payouts it:</p>
          <ol>
            <li>Reads their wallet&apos;s fee vaults across both pump programs.</li>
            <li>
              {"Skips vaults under "}
              <strong>0.005 SOL</strong>
              {" — below that, the transaction fee would eat too much of the payout."}
            </li>
            <li>
              {"Submits one transaction: "}
              <code>collect_creator_fee</code>
              {" into the recipient's own wallet. Phobit pays the network fee; their wallet needs no SOL."}
            </li>
            <li>
              {"Swaps the collected AAPLx, inside their wallet, to "}
              <strong>USDC</strong>
              {
                " through Jupiter, so the payout is stablecoin-denominated from this point on. The USDC received is the payout's dollar value."
              }
            </li>
            <li>
              {
                "Records the payout for the coin's recipient and, if they have a card, submits it to the bridge — status "
              }
              <em>Bridging to card</em>
              {". Without a card it waits as "}
              <em>Awaiting card</em>.
            </li>
            <li>
              {"Marks bridged payouts "}
              <em>Settled</em>
              {" once the dollars are on the card, usually within a couple of minutes."}
            </li>
            <li>
              {"Retries every "}
              <em>Awaiting card</em>
              {" payout, so claiming late never loses anything."}
            </li>
          </ol>
          <p>
            {"Every sweep and every swap is a public Solana transaction. The "}
            <Link href="/payouts">Payouts</Link>
            {" page and the claim dashboard link each one to the explorer."}
          </p>
        </Section>
        <Section id="payout-lifecycle" title="Payout lifecycle">
          <Table
            head={["State", "Meaning", "What happens next"]}
            rows={[
              ["Swept", "Fees collected on-chain into the recipient's wallet.", "Swapped to USDC in the same run."],
              [
                "Converted to USDC",
                "SOL swapped to USDC on Jupiter; dollar value fixed.",
                "Submitted to the bridge if a card exists.",
              ],
              [
                "Awaiting card",
                "Recipient hasn't created a card yet, or removed it.",
                "Retried every run until a card is active.",
              ],
              ["Bridging to card", "USDC is being converted and settled onto the card.", "Settles within minutes."],
              ["Settled", "Dollars are on the card and spendable.", "Final."],
              [
                "Failed",
                "The bridge rejected the payout (e.g. card closed).",
                "Shown with the reason; recreate a card to retry.",
              ],
            ]}
          />
        </Section>
        <Section id="pricing" title="USD pricing">
          <p>
            Fees accrue in AAPLx. At sweep time the keeper swaps them to USDC on Jupiter, and the USDC received is the
            payout's dollar value — an actual conversion, not an estimate. The SOL figure shows what moved on-chain.
            Because conversion happens at sweep, not at trade, a recipient's dollar total reflects Apple's share price
            over time, not at the moment each fee was earned.
          </p>
          <p>
            Analytics and coin pages show USD from the actual swaps. Unswept fees (still in a vault) are shown in SOL
            with an indicative USD value at the current price.
          </p>
        </Section>
        <Section id="security" title="Security & privacy">
          <h3>Who can claim</h3>
          <p>
            Only someone who completes a texted code for the exact phone number the launcher entered. The code is
            verified by our auth provider and yields a short-lived access token; every recipient-scoped request —
            reading your payouts, attaching or removing a card — is authorized by that token, and the recipient identity
            is derived from it on the server. There is no way to pass a different contact.
          </p>
          <h3>What we store</h3>
          <ul>
            <li>The normalized contact, so we can match claims to coins.</li>
            <li>Your Phobit card details, encrypted at rest, shown only to you after verification.</li>
            <li>Coins, sweeps and payouts — all of which are also visible on-chain.</li>
          </ul>
          <h3>What's public</h3>
          <p>
            {"Coin pages and the payouts ledger show recipients "}
            <strong>masked</strong>
            {": "}
            <code>+1 ••• ••• 0123</code>
            {" or "}
            <code>n•••e@icloud.com</code>. The raw contact never leaves the server.
          </p>
          <h3>Launch integrity</h3>
          <p>
            Launch transactions are built server-side and signed by the mint; your wallet adds the second signature.
            Before broadcasting, the server checks the signed transaction still contains the mint it prepared, so a
            client cannot substitute an arbitrary transaction.
          </p>
        </Section>
        <Section id="limits" title="Limits & regions">
          <Table
            head={["Item", "Limit"]}
            rows={[
              ["Coin name / symbol", "32 / 10 characters"],
              ["Image", "PNG, JPEG, WebP or GIF, up to 5 MB"],
              ["Quote asset", "AAPLx (tokenized Apple stock), fixed"],
              ["Creator fee", "3% — pump.fun's maximum"],
              ["Minimum sweep", "0.005 SOL per vault"],
              ["Phobit card", "Virtual Visa debit, Apple Wallet provisioning; Google Wallet soon"],
              ["Recipient verification", "Any mobile number that can receive SMS, with country code"],
            ]}
          />
          <p>
            {"Card issuance is US-first. Recipients elsewhere can still be named — their payouts wait as "}
            <em>Awaiting card</em>
            {" — and are released when issuance opens in their region."}
          </p>
        </Section>
        <Section id="api" title="Public API">
          <p>
            Read-only endpoints, no key required. Contacts are always masked. Recipient-scoped endpoints require the
            claim session's bearer token.
          </p>
          <Table
            head={["Endpoint", "Returns"]}
            rows={[
              [<code key={"1"}>GET /api/coins</code>, "Live coins, newest first. ?wallet= filters by launcher."],
              [
                <code key={"2"}>GET /api/coins/:mint</code>,
                "One coin with live curve state, market cap, unswept fees and recipient claim status.",
              ],
              [
                <code key={"3"}>GET /api/payouts</code>,
                "Sweep ledger with masked recipients. ?mine=1 + bearer → only yours.",
              ],
              [<code key={"4"}>GET /api/analytics</code>, "30-day daily fee series and platform totals."],
              [
                <code key={"5"}>GET /api/recipients</code>,
                "Bearer only. Your card, coins routing to you, totals by stage, and your payouts.",
              ],
              [<code key={"6"}>POST /api/card</code>, "Bearer only. Issues your virtual Phobit card."],
            ]}
          />
        </Section>
        <Section id="glossary" title="Glossary">
          <dl>
            <dt>Bonding curve</dt>
            <dd>
              pump.fun's pricing mechanism for a new coin. Price rises as supply is bought; when the curve fills,
              liquidity moves to the pump AMM.
            </dd>
            <dt>Creator fee</dt>
            <dd>
              The 30 bps slice of every trade that pump.fun pays to the coin's creator key. On Phobit, this is what goes
              to the recipient.
            </dd>
            <dt>Creator vault</dt>
            <dd>
              The on-chain account that accumulates a creator key's fees. Phobit derives one creator key, and so one
              vault, per coin.
            </dd>
            <dt>Bridge</dt>
            <dd>The step that turns a payout's USDC into US dollars on the recipient's card.</dd>
            <dt>Keeper</dt>
            <dd>Phobit's scheduled job that sweeps vaults and routes payouts.</dd>
            <dt>Recipient</dt>
            <dd>The phone number a coin's fees are held for.</dd>
            <dt>Sweep</dt>
            <dd>One collection of a vault's balance into the recipient's wallet, recorded as one payout.</dd>
          </dl>
        </Section>
        <Section id="faq" title="FAQ">
          <Faq q="Can I name myself as the recipient?">
            Yes. Enter your own number, then claim it. You'll still sign the launch with your wallet; the fees simply
            bypass the wallet and land on your card.
          </Faq>
          <Faq q="What if the recipient never claims?">
            {"Their payouts accumulate as "}
            <em>Awaiting card</em>
            {" indefinitely — already converted to USDC, so the dollar value is locked in — until they claim."}
          </Faq>
          <Faq q="Can the recipient be changed after launch?">
            No. The recipient is bound to the mint. Launch a new coin if you need a different one.
          </Faq>
          <Faq q="Do recipients need a wallet or any crypto?">
            No. A phone that receives texts. We issue the card; they add it to Apple Wallet if they like.
          </Faq>
          <Faq q="Is the Phobit card a real card?">
            Yes — a virtual Visa debit card issued to you at claim time. Use the number online, or add it to Apple
            Wallet and tap to pay in person.
          </Faq>
          <Faq q="Is the coin any different on pump.fun?">
            No. Same program, same curve, same graduation to the AMM. The only difference is who the creator key belongs
            to.
          </Faq>
          <Faq q="Why a phone number and not an X handle?">
            Because the recipient has to prove they own it before a card can be attached. A texted code is that proof; a
            handle isn't.
          </Faq>
        </Section>
        <footer className="mt-20 flex items-center justify-between border-t border-line pt-6 text-[12px] text-fg-3">
          <span>Questions? Open an issue or reach us on X.</span>
          <a href="#overview" className="inline-flex items-center gap-1 hover:text-fg">
            {"Back to top "}
            <Icons.Arrow width={12} height={12} className="-rotate-90" />
          </a>
        </footer>
      </article>
    </div>
  );
}
