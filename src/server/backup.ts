import { db } from "./db";

/** Every model in schema.prisma, by its Prisma client accessor name. Kept as an explicit list
    (not reflection over `db._dmmf` or similar) so adding a model is a deliberate one-line change
    here rather than something that silently starts or stops being backed up. */
const TABLES = [
  "coach",
  "timeOff",
  "booking",
  "recurringSeries",
  "attendanceRecord",
  "waitlistEntry",
  "classAddIn",
  "member",
  "waiverSignature",
  "bodPodResult",
  "churnFollowUp",
  "sharedAccount",
  "sale",
  "sessionCredit",
  "sessionType",
  "product",
  "auditLog",
  "businessSettings",
] as const;

export interface DatabaseDump {
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/** A plain-JSON export of every row in every table — not a real `pg_dump`, since Vercel's
    serverless runtime has no `pg_dump` binary available. Fine at this database's size (a few MB);
    restoring means re-inserting each table's rows in this same order (parents before the foreign
    keys that reference them — the list above is already ordered that way). */
export async function exportDatabaseJson(): Promise<DatabaseDump> {
  const tables: Record<string, unknown[]> = {};
  for (const name of TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the same findMany() call shape across every model, only the accessor name changes per iteration.
    tables[name] = await (db as any)[name].findMany();
  }
  return { exportedAt: new Date().toISOString(), tables };
}
