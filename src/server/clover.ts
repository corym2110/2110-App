"use server";

import { randomUUID } from "crypto";
import { db } from "./db";

/** Sandbox hosts today; swapping CLOVER_ENV to "production" later is enough to point this whole
    module at the real API — the request shapes are identical between environments. */
const HOSTS =
  process.env.CLOVER_ENV === "production"
    ? { tokens: "https://token.clover.com", scl: "https://scl.clover.com" }
    : { tokens: "https://token-sandbox.dev.clover.com", scl: "https://scl-sandbox.dev.clover.com" };

function privateToken(): string {
  const token = process.env.CLOVER_PRIVATE_TOKEN;
  if (!token) throw new Error("CLOVER_PRIVATE_TOKEN is not set.");
  return token;
}

async function sclFetch(path: string, init: RequestInit & { body?: string }): Promise<Response> {
  return fetch(`${HOSTS.scl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${privateToken()}`,
      ...init.headers,
    },
  });
}

export interface CloverCard {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
}

/** Saves a tokenized card (from the hosted iframe's clover.createToken()) as this member's
    card on file. Creates a Clover Customer the first time, or attaches the new token to the
    existing one on a re-save (e.g. an expired card gets replaced). Never touches a raw card
    number — `cardToken` is the `clv_...` token the browser got back from Clover directly. */
export async function saveCardForMember(memberId: string, cardToken: string): Promise<CloverCard> {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });

  const res = member.cloverCustomerId
    ? await sclFetch(`/v1/customers/${member.cloverCustomerId}`, {
        method: "PUT",
        body: JSON.stringify({ source: cardToken }),
      })
    : await sclFetch(`/v1/customers`, {
        method: "POST",
        body: JSON.stringify({
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          source: cardToken,
        }),
      });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Clover rejected the card (${res.status}): ${body}`);
  }
  const data = await res.json();

  if (!member.cloverCustomerId) {
    await db.member.update({ where: { id: memberId }, data: { cloverCustomerId: data.id } });
  }

  const card = data.defaultCard ?? data.cards?.[0];
  return {
    brand: card?.cardType ?? card?.brand ?? "Card",
    last4: card?.last4 ?? "0000",
    expMonth: String(card?.expirationDate?.slice(0, 2) ?? card?.first6 ?? ""),
    expYear: String(card?.expirationDate?.slice(2) ?? ""),
  };
}

export async function getCardOnFile(memberId: string): Promise<CloverCard | null> {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  if (!member.cloverCustomerId) return null;

  const res = await sclFetch(`/v1/customers/${member.cloverCustomerId}`, { method: "GET" });
  if (!res.ok) return null;
  const data = await res.json();
  const card = data.defaultCard ?? data.cards?.[0];
  if (!card) return null;
  return {
    brand: card.cardType ?? card.brand ?? "Card",
    last4: card.last4 ?? "0000",
    expMonth: String(card.expirationDate?.slice(0, 2) ?? ""),
    expYear: String(card.expirationDate?.slice(2) ?? ""),
  };
}

export interface ChargeResult {
  ok: boolean;
  chargeId?: string;
  error?: string;
}

/** Charges a member's saved card on file with the client not present (a period pre-bill, a POS
    "charge card on file" line) — `initiator: "MERCHANT"` is what tells Clover this is a
    merchant-initiated off-session charge against stored credentials, not a fresh card entry. */
export async function chargeCardOnFile(memberId: string, amountCents: number, currency = "CAD"): Promise<ChargeResult> {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  if (!member.cloverCustomerId) return { ok: false, error: "No card on file for this member." };

  const res = await sclFetch(`/v1/charges`, {
    method: "POST",
    headers: { "idempotency-key": randomUUID() },
    body: JSON.stringify({
      amount: amountCents,
      currency,
      source: member.cloverCustomerId,
      stored_credentials: { sequence: "SUBSEQUENT", is_scheduled: false, initiator: "MERCHANT" },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, error: data?.message ?? `Charge failed (${res.status}).` };
  return { ok: true, chargeId: data.id };
}
