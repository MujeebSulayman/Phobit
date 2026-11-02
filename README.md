# usedebit — app

A Next.js 16 (App Router), React 19, Tailwind CSS v4 and TypeScript app: the usedebit.app frontend (reconstructed from the compiled mirror in `../usedebit.app`) plus its own backend in `src/server` + `src/app/api`. It talks to your Neon database, Privy (phone sign-in + wallets), RPC, Pinata, Jupiter and pump.fun — nothing of Debit's.

## Run

```bash
cp .env.example .env.local   # fill in the values (each one is documented there)
npm install
npm run dev                  # http://localhost:3000
```

**Database (Neon).** Only the server connects; the browser never touches the database. Create a Neon project, set `DATABASE_URL` to its pooled connection string, and apply the schema with `psql "$DATABASE_URL" -f db/migrations/0001_init.sql` (or paste it into the Neon SQL editor).

**Privy.** In dashboard.privy.io:
1. Login methods: **SMS only**. Recipients sign in with the phone number a launcher entered and nothing else, so the wallet made for that number is the one they get.
2. Enable Solana embedded wallets.
3. Create an authorization key, then a key quorum containing it. Set `NEXT_PUBLIC_PRIVY_SIGNER_ID` (quorum id) and `PRIVY_AUTHORIZATION_KEY` (its private key).
4. Recommended: create a policy for that signer allowing only the programs the keeper uses (pump `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`, pump-amm `pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA`, Jupiter `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`, the token/ATA/compute-budget programs) and set `NEXT_PUBLIC_PRIVY_POLICY_ID`. Without it, our signer could move anything in recipient wallets.

**Treasury.** `TREASURY_SECRET_KEY` only pays network fees and token-account rent for recipient wallets, which hold no SOL. Keep ~0.2 SOL in it. It never holds anyone's fees.

**Keeper.** `vercel.json` schedules `/api/keeper` every 10 minutes on Vercel. Elsewhere, call it from any scheduler:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/keeper
```

## Routes

| Route | Type | Notes |
| --- | --- | --- |
| `/` | server + client islands | Hero, bento grid (avatar marquee, sweeps feed, fees chart, launch demo, card, docs demo), top tokens |
| `/explore` | server → client grid | Search (`?q=`), filters, sort |
| `/launch` | client | Connect wallet (Privy) → image upload → optional SOL→AAPLx swap → prepare → sign → submit |
| `/claim` | client | Privy SMS sign-in → wallet (balance, automatic payouts, withdraw, export key) → card → payouts |
| `/payouts` | client | Payout ledger |
| `/analytics` | client | Totals, daily bars, trend sparkline |
| `/docs` | client | Docs with scroll-spy table of contents |
| `/coin/[mint]` | server | Coin detail page |
| `/api/avatar/[handle]` | route | Serves `public/avatars/*.jpg` |
| `GET /api/coins`, `/api/coins/[mint]` | route | Coins (`?wallet=`), one coin with live vault/market-cap state |
| `GET /api/payouts`, `/api/analytics` | route | Ledger (`?limit=`, `?mine=1` + bearer), 30-day series + totals |
| `GET/DELETE /api/recipients`, `POST/PATCH /api/card` | route | Bearer (Privy session): dashboard incl. wallet, remove card, issue card, mark added to wallet |
| `POST /api/wallet/signer` | route | Bearer: re-reads from Privy whether our signer is on the wallet (after the user approves it) |
| `POST/PUT /api/wallet/withdraw` | route | Bearer: builds a USDC transfer (treasury pays the fee) / broadcasts it once the user signed |
| `POST /api/upload` | route | Pins image + metadata JSON to IPFS (Pinata) |
| `POST/PUT /api/launch/swap` | route | Builds / broadcasts the user's SOL → quote-asset dev-buy swap (Jupiter) |
| `POST /api/launch/prepare`, `/api/launch/submit` | route | Creates/finds the recipient's Privy wallet, builds `create_v2` (+ `buy_v2`) with it as creator, signed by a fresh mint; verifies the exact message and broadcasts |
| `GET /api/keeper` | cron | Reconcile → collect fees into recipient wallets → swap to USDC there → route to cards → settle |

## Layout

```
src/
  app/            routes, layout, template (page transition), globals.css (theme + component classes)
  components/     layout/, home/, claim/ (incl. WalletPanel), docs/, explore/, analytics/, ui/, icons, motion
  lib/            format, contact (phone validation), useWallet (Privy external wallets), server-data, types
  server/         backend (server-only): env, db (Neon, parameterised `sql` tag), auth + privy (sessions, wallets, signing), crypto
                  (treasury, card encryption), solana, pump (pump.fun SDK), jupiter, prices, pinata, launch,
                  queries, routing, wallet (withdrawals), cards, keeper
db/migrations/         database schema + SQL functions (Neon / Postgres)
```

## Backend design

- **Phone number → wallet.** At launch the server finds or creates the Privy user for the recipient's phone number, with a Solana wallet, before that person has ever signed up. That wallet is the coin's pump.fun `creator`, so fees accrue to a vault only it controls. When the person signs in on `/claim` with that number and the SMS code, the wallet is theirs. There's no escrow, no master key, and Debit never holds the fees.
- **Automatic payouts.** Wallets we create carry our Privy key quorum as an extra signer, so the keeper can collect fees into the wallet and swap them to USDC there. The treasury pays the network fee. If someone already had a Privy account without our signer, their fees keep accruing safely; they turn on automatic payouts from the dashboard, which calls `addSigners`.
- **Attribution.** pump.fun keys the vault by creator, so coins naming the same number share one vault. A payout is linked to a coin when the recipient has exactly one; otherwise its `mint` is null ("Several coins").
- **Withdraw / export.** Recipients can send USDC to any Solana address. The server builds the transfer and the treasury pre-signs as fee payer; the user signs in the browser. They can also export the wallet's private key from Privy.
- **Launch.** `prepare` builds the transaction with the pump.fun SDK (quote = `QUOTE_MINT`, `CREATOR_FEE_BPS`), signs it as a fresh mint, and stores the exact message bytes. `submit` rejects anything that isn't byte-identical. The keeper promotes launches the client lost track of.
- **Payout lifecycle.** `sweeping` (internal, recorded before broadcast) → `swept` (in the wallet) → `swapped` (USDC received = dollar value) → `unrouted` (no card) or `submitted` → `paid` / `failed`. Every stage is resumable, and a DB lease stops keeper runs from overlapping.
- **Cards.** `src/server/cards.ts` defines a `CardProvider` interface. The bundled `sandbox` provider issues test card numbers and moves no money; the USDC stays in the recipient's wallet. Privy's card issuing (Bridge, spends straight from the wallet's USDC) is the natural production option.
- **Security.** The recipient identity always comes from a verified Privy access token, and sign-in is SMS-only. Only the server holds `DATABASE_URL`, and every query uses bind parameters. Multi-table writes (`finalize_launch`, `record_swap`) and the keeper lease are Postgres functions, so they're atomic.

## Reconstruction notes

- The original backend was never in the mirror. `src/server` is a new implementation of the contract the frontend and the docs page describe.
- The `/explore` grid's client chunk and the whole `/coin/[mint]` page were also missing from the mirror. Both were rebuilt from the shared coin-card code and the captured loading skeletons, so they won't match the original exactly.
- All keys come from environment variables. The original site's values are not hardcoded.
# Phobit
