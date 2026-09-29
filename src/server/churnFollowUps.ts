"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getCurrentCoach } from "./coaches";
import { logAudit } from "./auditLog";
import { parseInput } from "@/lib/validate";
import { LogFollowUpInputSchema, type LogFollowUpInput } from "@/lib/schemas";
import { runAction, type ActionResult } from "@/lib/actionResult";

export type { LogFollowUpInput };

/** Logs "a coach followed up with this at-risk client" — doesn't touch `riskReasons` itself
    (still computed live in churnRisk.ts), just gives the dashboard's "At risk" card a real
    timestamp to snooze against once someone's actually reached out. */
export async function markFollowedUp(input: LogFollowUpInput): Promise<ActionResult<string>> {
  return runAction(async () => {
    const data = parseInput(LogFollowUpInputSchema, input);
    const actor = await getCurrentCoach();
    const row = await db.churnFollowUp.create({
      data: {
        memberId: data.memberId,
        note: data.note || undefined,
        coachId: actor?.id,
      },
    });

    await logAudit({ actorId: actor?.id ?? null, actorName: actor?.name ?? "Unknown", action: "member.followUp", targetType: "Member", targetId: data.memberId });

    revalidatePath(`/members/${data.memberId}`);
    revalidatePath("/dashboard");
    return row.id;
  });
}

/** Every member's most recent follow-up date, one indexed query for the whole roster — used to
    populate `Member.lastFollowUpAt` for every member at once rather than a per-member lookup. */
export async function getLatestFollowUpDates(): Promise<Map<string, Date>> {
  const rows = await db.churnFollowUp.groupBy({ by: ["memberId"], _max: { createdAt: true } });
  const map = new Map<string, Date>();
  for (const r of rows) {
    if (r._max.createdAt) map.set(r.memberId, r._max.createdAt);
  }
  return map;
}
