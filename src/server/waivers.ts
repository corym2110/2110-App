"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { ADULT_LIABILITY_WAIVER, ADULT_LIABILITY_WAIVER_VERSION, type WaiverBlock } from "@/data/waivers/adultLiabilityWaiver";
import { YOUTH_WAIVER, YOUTH_WAIVER_VERSION } from "@/data/waivers/youthWaiver";

export type WaiverType = "Adult Liability Waiver" | "Youth Waiver";

function contentFor(type: WaiverType): { blocks: WaiverBlock[]; version: string } {
  return type === "Adult Liability Waiver"
    ? { blocks: ADULT_LIABILITY_WAIVER, version: ADULT_LIABILITY_WAIVER_VERSION }
    : { blocks: YOUTH_WAIVER, version: YOUTH_WAIVER_VERSION };
}

function renderSnapshot(blocks: WaiverBlock[], version: string): string {
  const body = blocks.map((b) => (b.heading ? `${b.heading}\n${b.body}` : b.body)).join("\n\n");
  return `[Version ${version}]\n\n${body}`;
}

export interface SignWaiverInput {
  memberId: string;
  waiverType: WaiverType;
  signerName: string;
  minorName?: string;
  pickupNames?: string[];
  signatureDataUrl: string;
  signedByCoachId?: string;
}

export async function signWaiver(input: SignWaiverInput): Promise<string> {
  const { blocks, version } = contentFor(input.waiverType);
  const row = await db.waiverSignature.create({
    data: {
      memberId: input.memberId,
      waiverType: input.waiverType,
      contentSnapshot: renderSnapshot(blocks, version),
      signerName: input.signerName.trim(),
      minorName: input.minorName?.trim() || undefined,
      pickupNames: (input.pickupNames ?? []).map((n) => n.trim()).filter(Boolean),
      signatureDataUrl: input.signatureDataUrl,
      signedByCoachId: input.signedByCoachId || undefined,
    },
  });
  revalidatePath(`/members/${input.memberId}`);
  return row.id;
}

export interface WaiverSummaryRow {
  id: string;
  waiverType: string;
  signerName: string;
  createdAt: string;
}

/** Every signature on file for a member, newest first — used for the status badge and history list. */
export async function getWaiverSignaturesForMember(memberId: string): Promise<WaiverSummaryRow[]> {
  const rows = await db.waiverSignature.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, waiverType: r.waiverType, signerName: r.signerName, createdAt: r.createdAt.toISOString() }));
}

export interface WaiverDetail {
  id: string;
  waiverType: string;
  contentSnapshot: string;
  signerName: string;
  minorName: string | null;
  pickupNames: string[];
  signatureDataUrl: string;
  createdAt: string;
  memberName: string;
  signedByCoach: string | null;
}

/** Waiver content (health-adjacent liability details, a signature image) is sensitive enough to
    require an explicit signed-in-coach check inside the action itself, not just reliance on
    whatever page happened to invoke it — staff legitimately share visibility across all members
    at this single-facility scale, so this isn't a per-coach ownership check, just a real auth
    gate instead of an incidental one. */
export async function getWaiverSignature(id: string): Promise<WaiverDetail | null> {
  const requester = await getCurrentCoach();
  if (!requester) throw new Error("Not authenticated.");

  const row = await db.waiverSignature.findUnique({ where: { id }, include: { member: true, signedByCoach: true } });
  if (!row) return null;
  return {
    id: row.id,
    waiverType: row.waiverType,
    contentSnapshot: row.contentSnapshot,
    signerName: row.signerName,
    minorName: row.minorName,
    pickupNames: row.pickupNames,
    signatureDataUrl: row.signatureDataUrl,
    createdAt: row.createdAt.toISOString(),
    memberName: `${row.member.firstName} ${row.member.lastName}`.trim(),
    signedByCoach: row.signedByCoach?.name ?? null,
  };
}
