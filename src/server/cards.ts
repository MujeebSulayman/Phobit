import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { env } from "./env";

export type IssuedCard = { providerCardId: string; pan: string; exp: string; cvv: string };
export type TransferStatus = { state: "pending" } | { state: "paid" } | { state: "failed"; reason: string };

/**
 * What the keeper and the card endpoints need from a card issuer. Plug a real issuer
 * (one that issues virtual Visa cards funded with USDC and supports Apple Pay push
 * provisioning) in behind this interface.
 */
export interface CardProvider {
  name: string;
  issueCard(input: { recipientKey: string; contact: string }): Promise<IssuedCard>;
  closeCard(providerCardId: string): Promise<void>;
  /** Moves `usdcAmount` from the treasury onto the card; returns the provider's transfer id. */
  fundCard(input: { providerCardId: string; usdcAmount: number; idempotencyKey: string }): Promise<string>;
  transferStatus(transferId: string): Promise<TransferStatus>;
}

function luhnDigit(partial: string): number {
  let sum = 0;
  for (let i = 0; i < partial.length; i++) {
    let d = Number(partial[partial.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Development provider: issues Luhn-valid test Visa numbers and reports every transfer as
 * settled. No money moves — swapped USDC stays in the treasury.
 */
const sandbox: CardProvider = {
  name: "sandbox",
  async issueCard() {
    let body = "4";
    while (body.length < 15) body += randomInt(10);
    const now = new Date();
    const exp = `${String(now.getMonth() + 1).padStart(2, "0")}/${String((now.getFullYear() + 4) % 100).padStart(2, "0")}`;
    return {
      providerCardId: `sandbox_${randomUUID()}`,
      pan: body + luhnDigit(body),
      exp,
      cvv: String(randomInt(1000)).padStart(3, "0"),
    };
  },
  async closeCard() {},
  async fundCard({ idempotencyKey }) {
    return `sandbox_tx_${idempotencyKey}`;
  },
  async transferStatus() {
    return { state: "paid" };
  },
};

export function cardProvider(): CardProvider {
  const name = env.cardProvider();
  if (name === "sandbox") return sandbox;
  throw new Error(`Unknown CARD_PROVIDER "${name}"`);
}
