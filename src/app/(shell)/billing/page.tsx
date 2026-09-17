"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useCurrentCoach } from "@/lib/useCoaches";
import { getBillableTally, type BillableMemberRow } from "@/server/billing";
import { money } from "@/lib/time";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** This month's two pre-bill halves, plus which one is "current" — they bill at the start of a
    half for the sessions coming up in it, so before the 16th the live half is 1st–15th and from
    the 16th on it's 16th–end of month. */
function useMonthHalves() {
  return useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const first = { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-15`, label: "1st – 15th" };
    const second = { from: `${y}-${pad(m + 1)}-16`, to: `${y}-${pad(m + 1)}-${pad(lastDay)}`, label: `16th – ${lastDay}th` };
    return { first, second, current: now.getDate() <= 15 ? "first" : ("second" as "first" | "second") };
  }, []);
}

export default function BillingPage() {
  const coach = useCurrentCoach();
  const isAdmin = coach?.isAdmin ?? false;
  const halves = useMonthHalves();
  const [half, setHalf] = useState<"first" | "second">(halves.current);
  const period = half === "first" ? halves.first : halves.second;

  const [rows, setRows] = useState<BillableMemberRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBillableTally(period.from, period.to).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [period.from, period.to]);

  if (!isAdmin) {
    return <div className="px-5 py-16 text-center text-[13.5px] text-muted">You need admin access to view this.</div>;
  }

  const grandTotal = (rows ?? []).reduce((a, r) => a + r.subtotal, 0);
  const sessionCount = (rows ?? []).reduce((a, r) => a + r.items.reduce((b, i) => b + i.occurrenceKeys.length, 0), 0);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Bill sessions</h2>
          <div className="text-[13.5px] text-muted">
            A read-only tally of who&apos;s due for a Personal Training / Group Training pre-bill — the actual charge happens on the POS screen, so tax and payment
            method are handled correctly.
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1 rounded-[11px] border border-divider p-1">
          {(["first", "second"] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHalf(h)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] ${half === h ? "bg-row font-semibold text-fg" : "text-muted"}`}
            >
              {h === "first" ? halves.first.label : halves.second.label}
            </button>
          ))}
        </div>
      </div>

      {rows && rows.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-row px-4 py-3.5 text-[13.5px] text-muted">
          <span>
            {rows.length} client{rows.length === 1 ? "" : "s"} · {sessionCount} session{sessionCount === 1 ? "" : "s"} not yet billed
          </span>
          <span className="text-[15px] font-semibold text-fg tabular-nums">{money(grandTotal)} before tax</span>
        </div>
      )}

      <Card className="overflow-hidden px-0 py-0">
        <div className="grid grid-cols-[1.4fr_1.6fr_100px] items-center gap-3 border-b border-divider px-[22px] py-3 text-[11px] tracking-wider text-muted uppercase">
          <span>Client</span>
          <span>Sessions this period</span>
          <span className="text-right">Subtotal</span>
        </div>

        {rows === null && <div className="py-10 text-center text-[13.5px] text-muted">Tallying sessions…</div>}
        {rows?.length === 0 && <div className="py-10 text-center text-[13.5px] text-muted">No Personal Training or Group Training sessions to bill in this period.</div>}

        {rows?.map((r) => (
          <div key={r.memberId} className="grid grid-cols-[1.4fr_1.6fr_100px] items-center gap-3 border-b border-divider px-[22px] py-3 text-[13.5px] last:border-b-0">
            <Link href={`/members/${r.memberId}`} className="min-w-0 truncate hover:text-link">
              {r.name}
              <span className="block text-[12px] text-muted">{r.coachName}</span>
            </Link>
            <div className="flex flex-col gap-1.5">
              {r.items.map((i) => (
                <div key={i.sessionType} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="text-muted">
                    {i.occurrenceKeys.length}&times; {i.sessionType} @ {money(i.unitPrice)}
                  </span>
                  <Link
                    href={`/pos?member=${encodeURIComponent(r.name)}&type=${encodeURIComponent(i.sessionType)}&coach=${encodeURIComponent(r.coachName)}&qty=${i.occurrenceKeys.length}`}
                    className="flex-none text-link hover:text-link-hover"
                  >
                    Bill via POS →
                  </Link>
                </div>
              ))}
            </div>
            <span className="text-right font-medium tabular-nums">{money(r.subtotal)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
