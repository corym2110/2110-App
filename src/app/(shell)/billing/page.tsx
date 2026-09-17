"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useCurrentCoach } from "@/lib/useCoaches";
import { getBillableTally, billPeriod, type BillableMemberRow, type BillEntryInput, type PreBillType } from "@/server/billing";
import { money } from "@/lib/time";

const METHODS = ["Card", "Cash", "E-transfer"];

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

interface RowState {
  included: boolean;
  method: string;
  paid: boolean;
  unitPrices: Record<PreBillType, number>;
}

export default function BillingPage() {
  const coach = useCurrentCoach();
  const isAdmin = coach?.isAdmin ?? false;
  const halves = useMonthHalves();
  const [half, setHalf] = useState<"first" | "second">(halves.current);
  const period = half === "first" ? halves.first : halves.second;

  const [rows, setRows] = useState<BillableMemberRow[] | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBillableTally(period.from, period.to).then((r) => {
      if (cancelled) return;
      setRows(r);
      setResult(null);
      const state: Record<string, RowState> = {};
      for (const row of r) {
        const unitPrices = {} as Record<PreBillType, number>;
        for (const item of row.items) unitPrices[item.sessionType] = item.unitPrice;
        state[row.memberId] = { included: true, method: "Card", paid: true, unitPrices };
      }
      setRowState(state);
    });
    return () => {
      cancelled = true;
    };
  }, [period.from, period.to]);

  if (!isAdmin) {
    return <div className="px-5 py-16 text-center text-[13.5px] text-muted">You need admin access to bill sessions.</div>;
  }

  const included = (rows ?? []).filter((r) => rowState[r.memberId]?.included);
  const grandTotal = included.reduce((a, r) => {
    const st = rowState[r.memberId];
    return a + r.items.reduce((b, i) => b + i.occurrenceKeys.length * (st?.unitPrices[i.sessionType] ?? i.unitPrice), 0);
  }, 0);

  function patchRow(memberId: string, patch: Partial<RowState>) {
    setRowState((s) => ({ ...s, [memberId]: { ...s[memberId], ...patch } }));
  }

  function confirmBilling() {
    if (included.length === 0 || isPending) return;
    setError(null);
    const entries: BillEntryInput[] = included.map((r) => {
      const st = rowState[r.memberId];
      return {
        memberId: r.memberId,
        coachId: r.coachId ?? undefined,
        method: st.paid ? st.method : "Invoice",
        paid: st.paid,
        items: r.items.map((i) => ({ sessionType: i.sessionType, unitPrice: st.unitPrices[i.sessionType] ?? i.unitPrice, occurrenceKeys: i.occurrenceKeys })),
      };
    });
    startTransition(async () => {
      try {
        const { saleIds } = await billPeriod(period.from, period.to, entries);
        setResult(`Billed ${saleIds.length} client${saleIds.length === 1 ? "" : "s"} for ${period.label}.`);
      } catch {
        setError("Couldn't run that billing period. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Bill sessions</h2>
          <div className="text-[13.5px] text-muted">Pre-bill Personal Training &amp; Group Training for a period, auto-applied to the upcoming sessions.</div>
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

      {result && <div className="rounded-xl bg-ok/15 px-4 py-3 text-[13.5px] text-ok">{result}</div>}
      {error && <div className="rounded-xl bg-bad/10 px-4 py-3 text-[13.5px] text-bad">{error}</div>}

      <Card className="overflow-hidden px-0 py-0">
        <div className="grid grid-cols-[24px_1.4fr_1.6fr_100px_150px] items-center gap-3 border-b border-divider px-[22px] py-3 text-[11px] tracking-wider text-muted uppercase">
          <span />
          <span>Client</span>
          <span>Sessions this period</span>
          <span className="text-right">Total</span>
          <span>Payment</span>
        </div>

        {rows === null && <div className="py-10 text-center text-[13.5px] text-muted">Tallying sessions…</div>}
        {rows?.length === 0 && <div className="py-10 text-center text-[13.5px] text-muted">No Personal Training or Group Training sessions to bill in this period.</div>}

        {rows?.map((r) => {
          const st = rowState[r.memberId];
          if (!st) return null;
          const rowTotal = r.items.reduce((a, i) => a + i.occurrenceKeys.length * (st.unitPrices[i.sessionType] ?? i.unitPrice), 0);
          return (
            <div key={r.memberId} className={`grid grid-cols-[24px_1.4fr_1.6fr_100px_150px] items-center gap-3 border-b border-divider px-[22px] py-3 text-[13.5px] last:border-b-0 ${!st.included ? "opacity-50" : ""}`}>
              <input type="checkbox" checked={st.included} onChange={(e) => patchRow(r.memberId, { included: e.target.checked })} className="h-4 w-4" />
              <Link href={`/members/${r.memberId}`} className="min-w-0 truncate hover:text-link">
                {r.name}
                <span className="block text-[12px] text-muted">{r.coachName}</span>
              </Link>
              <div className="flex flex-col gap-1">
                {r.items.map((i) => (
                  <div key={i.sessionType} className="flex items-center gap-2 text-[12.5px]">
                    <span className="w-[110px] flex-none text-muted">{i.occurrenceKeys.length}&times; {i.sessionType}</span>
                    <span className="text-muted">@</span>
                    <span className="flex h-7 w-[76px] flex-none items-center rounded-md border border-divider px-1.5">
                      <span className="mr-0.5 text-muted">$</span>
                      <input
                        type="number"
                        min={0}
                        value={st.unitPrices[i.sessionType]}
                        onChange={(e) => patchRow(r.memberId, { unitPrices: { ...st.unitPrices, [i.sessionType]: Math.max(0, Number(e.target.value) || 0) } })}
                        className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
                      />
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-right font-medium tabular-nums">{money(rowTotal)}</span>
              <div className="flex flex-col gap-1">
                <Select
                  value={st.paid ? st.method : "Invoice"}
                  onChange={(v) => (v === "Invoice" ? patchRow(r.memberId, { paid: false }) : patchRow(r.memberId, { method: v, paid: true }))}
                  options={[...METHODS.map((m) => ({ value: m, label: m })), { value: "Invoice", label: "Invoice (unpaid)" }]}
                  className="h-8 rounded-md px-2 text-[12.5px]"
                />
              </div>
            </div>
          );
        })}
      </Card>

      {rows && rows.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-row px-4 py-3.5">
          <span className="text-[13.5px] text-muted">
            {included.length} client{included.length === 1 ? "" : "s"} selected · before tax
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[19px] font-semibold tabular-nums">{money(grandTotal)}</span>
            <button
              type="button"
              onClick={confirmBilling}
              disabled={included.length === 0 || isPending}
              className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
            >
              {isPending ? "Billing…" : `Bill ${included.length || ""} client${included.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
