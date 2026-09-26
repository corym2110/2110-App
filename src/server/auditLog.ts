import { db } from "@/server/db";

export type LogAuditEntry = {
  actorId: string | null;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string;
};

export async function logAudit(entry: LogAuditEntry): Promise<void> {
  try {
    await db.auditLog.create({ data: entry });
  } catch {
    // Best-effort — a logging failure must never fail the real action it's attached to.
  }
}

export async function getAuditLogForTarget(targetType: string, targetId: string, take = 10) {
  return db.auditLog.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
