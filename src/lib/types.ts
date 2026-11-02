export type PayoutStatus = "swept" | "swapped" | "unrouted" | "submitted" | "paid" | "failed";

export type Recipient = {
  kind: "phone" | string;
  /** e.g. "+1 ••• ••• 4266" */
  masked: string;
  claimed: boolean;
  cardActive: boolean;
};

export type Coin = {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_url: string | null;
  creator_wallet: string;
  fees_swept_lamports: number;
  created_at: string;
  recipient: Recipient;
  /** Present on GET /api/coins/:mint when the backend provides live state. */
  twitter?: string | null;
  website?: string | null;
  fee_vault?: string | null;
  unswept_lamports?: number | null;
  market_cap_usd?: number | null;
};

/** A sweep as shown in the home-page feed. */
export type FeedItem = {
  id: string;
  coin: string;
  recipient: string;
  usdCents: number;
  status: PayoutStatus;
  createdAt: string;
};

/** A payout row as returned by /api/payouts and /api/recipients. */
export type Payout = {
  id: string;
  /** Null when one collection from the recipient's wallet covered several coins. */
  mint: string | null;
  lamports: number;
  usdc_amount: number | null;
  usd_cents: number | null;
  status: PayoutStatus;
  sweep_signature: string | null;
  created_at: string;
  coin?: { name: string; symbol: string; image_url: string | null } | null;
  recipient?: string | null;
};

export type VirtualCard = {
  pan: string;
  exp: string;
  cvv: string;
  wallet_added_at: string | null;
};

/** GET /api/recipients — the signed-in recipient's dashboard. */
export type RecipientDashboard = {
  me: { masked: string };
  recipient: {
    status: "active" | "pending" | string;
    card: VirtualCard | null;
    card_display_name?: string | null;
  } | null;
  coins: Pick<Coin, "mint" | "name" | "symbol" | "image_url" | "fees_swept_lamports">[];
  /** The recipient's own Solana wallet (Privy). Fees are collected into it and converted to USDC. */
  wallet: RecipientWallet | null;
  payouts: Payout[];
  totals: { settledCents: number; inFlightCents: number; waitingCents: number; count: number };
};

/** GET /api/analytics */
export type AnalyticsResponse = {
  totals: { usdCents: number; lamports: number; payouts: number; paid: number; coins: number; recipients: number };
  series: { date: string; usdCents: number }[];
  solUsd: number | null;
};

export type RecipientWallet = {
  address: string;
  /** USDC sitting in the wallet, in cents. */
  usdcCents: number;
  /** Fees still waiting in pump.fun's vault for this wallet, indicative USD cents. */
  unclaimedCents: number | null;
  /** Our server signer is on the wallet, so fees are collected and converted automatically. */
  autoPayouts: boolean;
};

/** POST /api/wallet/withdraw */
export type WithdrawBuildResponse = { transaction: string; signature: string };
