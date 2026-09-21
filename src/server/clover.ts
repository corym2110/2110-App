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

async function sclFetch(path: string, init: RequestInit): Promise<Response> {
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
  id: string;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
}

/** Best-effort extraction across the couple of response shapes Clover's create/update customer
    call has been observed to return a card under. Ecommerce's `/v1/customers` has no GET/read
    verb at all (confirmed: it 405s) — reading a card back later requires the separate v3 REST
    API and a different credential we don't have, so the summary shown on our side is captured
    once, here, at save time, and cached locally rather than re-fetched from Clover. */
function extractCard(data: unknown): CloverCard | null {
  const d = data as Record<string, unknown> | null;
  if (!d) return null;
  const cardsField = d.cards as { elements?: unknown[] } | unknown[] | undefined;
  const cardsList = Array.isArray(cardsField) ? cardsField : cardsField?.elements;
  const card = (d.defaultCard ?? d.card ?? cardsList?.[0] ?? d) as Record<string, unknown> | undefined;
  if (!card) return null;
  const last4 = card.last4 ?? card.lastFour;
  const brand = card.cardType ?? card.brand ?? card.first6;
  if (!last4 && !brand) return null;
  const expiry = String(card.expirationDate ?? "");
  return {
    id: String(card.id ?? ""),
    brand: String(brand ?? "Card"),
    last4: String(last4 ?? "0000"),
    expMonth: expiry.slice(0, 2) || String(card.expMonth ?? ""),
    expYear: expiry.slice(2) || String(card.expYear ?? ""),
  };
}

export interface SaveCardResult {
  ok: boolean;
  card?: CloverCard | null;
  error?: string;
}

/** Clover allows only one card on file per customer — replacing it 409s ("Customer already has
    Card on File or ACH on File") unless the old one is revoked first. */
async function revokeCard(customerId: string, cardId: string): Promise<void> {
  await sclFetch(`/v1/customers/${customerId}/sources/${cardId}`, { method: "DELETE" }).catch(() => {});
}

/** Saves a tokenized card (from the hosted iframe's clover.createToken()) as this member's
    card on file. Creates a Clover Customer the first time, or attaches the new token to the
    existing one on a re-save (e.g. an expired card gets replaced) — revoking the old card first,
    since Clover rejects a second card on the same customer otherwise. Never touches a raw card
    number — `cardToken` is the `clv_...` token the browser got back from Clover directly.
    Returns a result object rather than throwing — Next.js redacts a Server Action's thrown
    error message in production, which would hide the real Clover failure reason. */
export async function saveCardForMember(memberId: string, cardToken: string): Promise<SaveCardResult> {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });

  try {
    const body = {
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      source: cardToken,
    };

    // The card token is single-use, so there's exactly one Clover call below, chosen up front —
    // a failed attempt can't be retried with a second request using the same token. When we know
    // which card is on the customer, revoke it first, then attach the new one to that customer.
    // Otherwise (no customer yet, or a legacy customer saved before we cached the card id, so
    // there's nothing to revoke) just create a fresh customer rather than risk a 409.
    let res: Response;
    if (member.cloverCustomerId && member.cloverCardId) {
      await revokeCard(member.cloverCustomerId, member.cloverCardId);
      res = await sclFetch(`/v1/customers/${member.cloverCustomerId}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
      res = await sclFetch(`/v1/customers`, { method: "POST", body: JSON.stringify(body) });
    }

    if (!res.ok) {
      const errorBody = await res.text();
      return { ok: false, error: `Clover rejected the card (${res.status}): ${errorBody}` };
    }
    const data = await res.json();
    const card = extractCard(data);

    await db.member.update({
      where: { id: memberId },
      data: {
        cloverCustomerId: (data as { id?: string }).id ?? member.cloverCustomerId,
        cloverCardId: card?.id || null,
        cloverCardBrand: card?.brand,
        cloverCardLast4: card?.last4,
        cloverCardExpiry: card ? `${card.expMonth}/${card.expYear}` : null,
      },
    });

    return { ok: true, card };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error saving the card." };
  }
}

/** Reads the cached card summary — never calls Clover, since there's no supported way to read a
    saved card back from the Ecommerce API with the credential this integration uses. */
export async function getCardOnFile(memberId: string): Promise<CloverCard | null> {
  const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
  if (!member.cloverCustomerId || !member.cloverCardLast4) return null;
  const [expMonth, expYear] = (member.cloverCardExpiry ?? "").split("/");
  return {
    id: member.cloverCardId ?? "",
    brand: member.cloverCardBrand ?? "Card",
    last4: member.cloverCardLast4,
    expMonth: expMonth ?? "",
    expYear: expYear ?? "",
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
