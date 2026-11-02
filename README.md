# usedebit — app

A Next.js 16 (App Router), React 19, Tailwind CSS v4 and TypeScript app: the usedebit.app frontend (reconstructed from the compiled mirror in `../usedebit.app`) plus its own backend in `src/server` + `src/app/api`. It talks to your Supabase, RPC, Pinata, Jupiter and pump.fun — nothing of Debit's.

## Run

```bash
cp .env.example .env.local   # fill in the values (each one is documented there)
npm install
npm run dev                  # http://localhost:3000
```

Database: create a Supabase project, run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`), and enable phone auth with an SMS provider.

Keeper: `vercel.json` schedules `/api/keeper` every 10 minutes on Vercel. Elsewhere, call it from any scheduler:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/keeper
```

## Routes

| Route | Type | Notes |
| --- | --- | --- |
| `/` | server + client islands | Hero, bento grid (avatar marquee, sweeps feed, fees chart, launch demo, card, docs demo), top tokens |
| `/explore` | server → client grid | Search (`?q=`), filters, sort |
| `/launch` | client | Image upload → optional SOL→AAPLx swap → prepare → sign → submit |
| `/claim` | client | Supabase SMS OTP → virtual card issuance → payouts dashboard |
| `/payouts` | client | Sweep ledger |
| `/analytics` | client | Totals, daily bars, trend sparkline |
| `/docs` | client | Docs with scroll-spy table of contents |
| `/coin/[mint]` | server | Coin detail page |
| `/api/avatar/[handle]` | route | Serves `public/avatars/*.jpg` |
| `GET /api/coins`, `/api/coins/[mint]` | route | Coins (`?wallet=`), one coin with live vault/market-cap state |
| `GET /api/payouts`, `/api/analytics` | route | Ledger (`?limit=`, `?mine=1` + bearer), 30-day series + totals |
| `GET/DELETE /api/recipients`, `POST/PATCH /api/card` | route | Bearer (Supabase phone session): dashboard, remove card, issue card, mark added to wallet |
| `POST /api/upload` | route | Pins image + metadata JSON to IPFS (Pinata) |
| `POST/PUT /api/launch/swap` | route | Builds / broadcasts the user's SOL → quote-asset dev-buy swap (Jupiter) |
| `POST /api/launch/prepare`, `/api/launch/submit` | route | Builds `create_v2` (+ `buy_v2`) signed by a fresh mint; verifies the exact message and broadcasts |
| `GET /api/keeper` | cron | Reconcile → sweep vaults → swap to USDC → route to cards → settle |

## Layout

```
src/
  app/            routes, layout, template (page transition), globals.css (theme + component classes)
  components/     layout/, home/, claim/, docs/, explore/, analytics/, ui/, icons, motion (Reveal/Words/EASE)
  lib/            format, contact (phone validation), useWallet (Reown AppKit), supabase, server-data, types
  server/         backend (server-only): env, db, auth, crypto (creator keys, card encryption), solana,
                  pump (pump.fun SDK), jupiter, prices, pinata, launch, queries, routing, cards, keeper
supabase/migrations/   database schema
```

## Backend design

- **Creator keys.** Each coin gets its own creator key: `Keypair.fromSeed(HMAC-SHA256(MASTER_SEED, mint))`. That gives each coin its own fee vault, and only the server can sign for it. Nothing per coin is stored.
- **Launch.** `prepare` generates the mint keypair, builds the transaction with the pump.fun SDK (quote = `QUOTE_MINT`, `CREATOR_FEE_BPS`), and signs it as the mint. It also stores the exact message bytes. `submit` rejects anything that isn't byte-identical, broadcasts it, and records the coin. If the client drops before confirmation, the keeper promotes the launch later.
- **Payout lifecycle.** `sweeping` (internal, recorded before broadcast) → `swept` → `swapped` (USDC received = dollar value) → `unrouted` (no card) or `submitted` → `paid` / `failed`. Every stage is resumable, and a DB lease stops keeper runs from overlapping.
- **Cards.** `src/server/cards.ts` defines a `CardProvider` interface. The bundled `sandbox` provider issues test card numbers and marks transfers settled **without moving money**: the USDC stays in the treasury. A real issuer adapter is needed before production. Card numbers are stored AES-256-GCM encrypted.
- **Security.** The recipient identity always comes from the verified Supabase token. All tables are service-role only (RLS on, no policies).

## Reconstruction notes

- The original backend was never in the mirror. `src/server` is a new implementation of the contract the frontend and the docs page describe.
- The `/explore` grid's client chunk and the whole `/coin/[mint]` page were also missing from the mirror. Both were rebuilt from the shared coin-card code and the captured loading skeletons, so they won't match the original exactly.
- The Supabase URL/key and the Reown project ID come from environment variables. The original site's values are not hardcoded.
# Phobit
