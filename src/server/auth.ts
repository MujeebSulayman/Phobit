import "server-only";
import type { NextRequest } from "next/server";
import { maskContact } from "@/lib/contact";
import { HttpError } from "./http";
import { embeddedSolanaWallet, phoneNumber, privy } from "./privy";

export type Me = {
  key: string;
  kind: "phone";
  contact: string;
  masked: string;
  privyUserId: string;
  wallet: { id: string; address: string } | null;
};

/**
 * Resolves the recipient from the claim session's Privy access token. Recipients can only sign in
 * with phone + SMS code, so a valid session proves they own the number. The identity always comes
 * from the verified token, never from the request body.
 */
export async function requireRecipient(req: NextRequest): Promise<Me> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Sign in required");
  let userId: string;
  try {
    userId = (await privy().utils().auth().verifyAccessToken(token)).user_id;
  } catch {
    throw new HttpError(401, "Session expired, sign in again");
  }
  const user = await privy().users()._get(userId);
  const contact = phoneNumber(user);
  if (!contact) throw new HttpError(403, "Sign in with your phone number");
  return {
    key: `phone:${contact}`,
    kind: "phone",
    contact,
    masked: maskContact("phone", contact),
    privyUserId: user.id,
    wallet: embeddedSolanaWallet(user),
  };
}

export function isCron(req: NextRequest, secret: string): boolean {
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
