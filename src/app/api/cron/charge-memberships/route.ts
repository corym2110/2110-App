import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { chargeCardOnFile, getCardOnFile } from "@/server/clover";
import { createSale } from "@/server/sales";

const MAX_FAILURES_BEFORE_PAUSE = 3;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Advances an ISO "YYYY-MM-DD" date by one calendar month, clamping to the target month's
    last day (e.g. Jan 31 -> Feb 28) instead of letting it roll into March like a naive
    setMonth() would. */
function addOneMonthIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const lastDayOfNextMonth = new Date(y, m + 1, 0).getDate();
  const day = Math.min(d, lastDayOfNextMonth);
  const next = new Date(y, m, day);
  return next.toISOString().slice(0, 10);
}

/** Runs daily via Vercel Cron (see vercel.json) — charges every member whose recurring
    membership is due today or earlier against their Clover card on file, records a paid Sale
    on success, and stops auto-retrying (flips to "failed") after 3 consecutive misses so a
    dead card doesn't get hammered silently forever. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await db.member.findMany({
    where: { membershipStatus: "active", nextBillDate: { lte: todayIso() } },
  });

  let charged = 0;
  let failed = 0;
  let skipped = 0;

  for (const member of due) {
    const card = await getCardOnFile(member.id);
    if (!card) {
      await db.member.update({
        where: { id: member.id },
        data: { lastBillAt: new Date(), lastBillStatus: "failed", lastBillError: "No card on file" },
      });
      skipped++;
      continue;
    }

    const amountCents = Math.round(Number(member.membershipPrice) * 100);
    const idempotencyKey = `membership:${member.id}:${member.nextBillDate}`;
    const result = await chargeCardOnFile(member.id, amountCents, "CAD", idempotencyKey);

    if (result.ok) {
      const monthLabel = new Date(`${member.nextBillDate}T00:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
      await createSale({
        memberId: member.id,
        summary: `${member.membershipName} — ${monthLabel}`,
        total: Number(member.membershipPrice),
        method: "Card",
        paid: true,
      });
      await db.member.update({
        where: { id: member.id },
        data: {
          nextBillDate: addOneMonthIso(member.nextBillDate!),
          billFailCount: 0,
          lastBillAt: new Date(),
          lastBillStatus: "paid",
          lastBillError: null,
        },
      });
      charged++;
    } else {
      const failCount = member.billFailCount + 1;
      await db.member.update({
        where: { id: member.id },
        data: {
          billFailCount: failCount,
          membershipStatus: failCount >= MAX_FAILURES_BEFORE_PAUSE ? "failed" : "active",
          lastBillAt: new Date(),
          lastBillStatus: "failed",
          lastBillError: result.error ?? "Charge failed",
        },
      });
      failed++;
    }
  }

  return NextResponse.json({ due: due.length, charged, failed, skipped });
}
