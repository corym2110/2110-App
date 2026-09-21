"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getPayrollForPeriod, type CoachPayrollRow } from "@/server/payroll";
import { money } from "@/lib/time";
import { useMonthHalves } from "@/lib/period";

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function downloadPayrollCsv(rows: CoachPayrollRow[], periodLabel: string) {
  const header = ["Coach", "Commission rate", "Commission sessions", "Commission $", "Hourly sessions", "Hours", "Hourly $", "Total"];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.coachName,
        `${Math.round(r.commissionRate * 100)}%`,
        String(r.commission.count),
        r.commission.subtotal.toFixed(2),
        String(r.hourly.count),
        r.hourly.hours.toFixed(2),
        r.hourly.subtotal.toFixed(2),
        r.total.toFixed(2),
      ]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `2110-fitness-payroll-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PayrollClient() {
  const halves = useMonthHalves();
  const [half, setHalf] = useState<"first" | "second">(halves.current);
  const period = half === "first" ? halves.first : halves.second;

  const [rows, setRows] = useState<CoachPayrollRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPayrollForPeriod(period.from, period.to).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [period.from, period.to]);

  const grandTotal = (rows ?? []).reduce((a, r) => a + r.total, 0);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Payroll</h2>
          <div className="text-[13.5px] text-muted">
            Every scheduled session in the period, by coach — commission types pay each coach&apos;s own rate, Bodpod/Class pay the flat hourly rate.
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap gap-1 rounded-[11px] border border-divider p-1">
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
          <button
            type="button"
            onClick={() => rows && downloadPayrollCsv(rows, `${halves.first.from.slice(0, 7)}-${period.label}`)}
            disabled={!rows || rows.length === 0}
            className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {rows && rows.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-row px-4 py-3.5 text-[13.5px] text-muted">
          <span>
            {rows.length} coach{rows.length === 1 ? "" : "es"} with sessions this period
          </span>
          <span className="text-[15px] font-semibold text-fg tabular-nums">{money(grandTotal)} total payout</span>
        </div>
      )}

      <Card className="overflow-hidden py-1.5">
        <div className="grid grid-cols-[minmax(0,1.3fr)_130px_130px_100px] gap-3.5 border-b border-divider px-[22px] py-3 text-[11px] tracking-wider text-muted uppercase">
          <span>Coach</span>
          <span className="text-right">Commission</span>
          <span className="text-right">Hourly</span>
          <span className="text-right">Total</span>
        </div>
        {rows === null && <div className="px-[22px] py-10 text-center text-[13.5px] text-muted">Loading…</div>}
        {rows && rows.length === 0 && <div className="px-[22px] py-10 text-center text-[13.5px] text-muted">No sessions scheduled this period.</div>}
        {rows?.map((r) => (
          <div key={r.coachId} className="grid grid-cols-[minmax(0,1.3fr)_130px_130px_100px] items-center gap-3.5 border-b border-divider px-[22px] py-3.5 last:border-b-0">
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-medium">{r.coachName}</div>
              {r.commissionRate === 0 && r.commission.count > 0 ? (
                <div className="text-xs text-bad">Set commission rate in Settings</div>
              ) : (
                <div className="text-xs text-muted">{Math.round(r.commissionRate * 100)}% commission</div>
              )}
            </div>
            <div className="text-right text-[13.5px] tabular-nums">
              {r.commission.count > 0 ? (
                <>
                  {money(r.commission.subtotal)}
                  <div className="text-xs text-muted">{r.commission.count} session{r.commission.count === 1 ? "" : "s"}</div>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
            <div className="text-right text-[13.5px] tabular-nums">
              {r.hourly.count > 0 ? (
                <>
                  {money(r.hourly.subtotal)}
                  <div className="text-xs text-muted">{r.hourly.hours.toFixed(1)} hrs</div>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
            <div className="text-right text-[15px] font-semibold tabular-nums">{money(r.total)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
