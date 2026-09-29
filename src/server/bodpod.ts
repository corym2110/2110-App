"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { logAudit } from "./auditLog";
import { parseInput } from "@/lib/validate";
import { LogBodPodResultInputSchema, type LogBodPodResultInput } from "@/lib/schemas";
import { runAction, type ActionResult } from "@/lib/actionResult";

export type { LogBodPodResultInput };

export async function logBodPodResult(input: LogBodPodResultInput): Promise<ActionResult<string>> {
  return runAction(async () => {
    const data = parseInput(LogBodPodResultInputSchema, input);
    const actor = await getCurrentCoach();
    const row = await db.bodPodResult.create({
      data: {
        memberId: data.memberId,
        scanIso: data.scanIso,
        bodyMassLbs: data.bodyMassLbs,
        fatMassLbs: data.fatMassLbs,
        fatFreeMassLbs: data.fatFreeMassLbs,
        bodyFatPct: data.bodyFatPct,
        rmrKcal: data.rmrKcal,
        notes: data.notes || undefined,
        loggedByCoachId: actor?.id,
      },
    });

    await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.bodpod.log", targetType: "Member", targetId: data.memberId, detail: data.scanIso });

    revalidatePath(`/members/${data.memberId}`);
    return row.id;
  });
}

export async function updateBodPodResult(id: string, input: LogBodPodResultInput): Promise<ActionResult<void>> {
  return runAction(async () => {
    const data = parseInput(LogBodPodResultInputSchema, input);
    await db.bodPodResult.update({
      where: { id },
      data: {
        scanIso: data.scanIso,
        bodyMassLbs: data.bodyMassLbs,
        fatMassLbs: data.fatMassLbs,
        fatFreeMassLbs: data.fatFreeMassLbs,
        bodyFatPct: data.bodyFatPct,
        rmrKcal: data.rmrKcal ?? null,
        notes: data.notes || undefined,
      },
    });

    const actor = await getCurrentCoach();
    await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.bodpod.update", targetType: "Member", targetId: data.memberId, detail: data.scanIso });

    revalidatePath(`/members/${data.memberId}`);
  });
}

export async function deleteBodPodResult(id: string, memberId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    await db.bodPodResult.delete({ where: { id } });

    const actor = await getCurrentCoach();
    await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.bodpod.delete", targetType: "Member", targetId: memberId });

    revalidatePath(`/members/${memberId}`);
  });
}

export interface BodPodResultRow {
  id: string;
  scanIso: string;
  bodyMassLbs: number;
  fatMassLbs: number;
  fatFreeMassLbs: number;
  bodyFatPct: number;
  rmrKcal: number | null;
  notes: string | null;
  loggedByCoachName: string | null;
  createdAt: string;
}

/** Every BodPod scan on file for a member, oldest first — so the trend chart and each row's
    "vs previous scan" delta read left-to-right chronologically. */
export async function getBodPodResultsForMember(memberId: string): Promise<BodPodResultRow[]> {
  const rows = await db.bodPodResult.findMany({
    where: { memberId },
    include: { loggedByCoach: true },
    orderBy: { scanIso: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    scanIso: r.scanIso,
    bodyMassLbs: Number(r.bodyMassLbs),
    fatMassLbs: Number(r.fatMassLbs),
    fatFreeMassLbs: Number(r.fatFreeMassLbs),
    bodyFatPct: Number(r.bodyFatPct),
    rmrKcal: r.rmrKcal != null ? Number(r.rmrKcal) : null,
    notes: r.notes,
    loggedByCoachName: r.loggedByCoach?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
