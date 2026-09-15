"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { ExportIcon } from "@/components/ui/icons";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useMembers } from "@/lib/useMembers";
import { useCurrentCoach } from "@/lib/useCoaches";
import { getRealReportsSummary, type RealReportsSummary, type ReportRangeKey } from "@/server/sales";
import { moneyRounded, money } from "@/lib/time";

const RANGES: ReportRangeKey[] = ["This week", "This month", "Last 90 days", "Year to date"];

const RANGE_LABEL: Record<ReportRangeKey, string> = {
  "This week": "Since Monday",
  "This month": "Month to date",
  "Last 90 days": "Last 90 days",
  "Year to date": "Since January 1",
};

const EMPTY_SUMMARY: RealReportsSummary = {
  revenue: 0,
  saleCount: 0,
  newMembers: 0,
  topSellers: [],
  paymentMethods: [],
  coachShare: [],
  outstandingBalance: 0,
};

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRangeKey>("This week");
  const [exportOpen, setExportOpen] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const [summary, setSummary] = useState<RealReportsSummary>(EMPTY_SUMMARY);
  const members = useMembers();
  const coach = useCurrentCoach();
  const isAdmin = coach?.isAdmin ?? false;
  const followUp = members
    .filter((m) => m.balance > 0 && (isAdmin || m.coach === coach?.name))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 6);

  useEffect(() => {
    if (coach === undefined) return; // still resolving who's signed in
    let cancelled = false;
    getRealReportsSummary(range, isAdmin ? undefined : coach?.id).then((s) => {
      if (!cancelled) setSummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, [range, coach, isAdmin]);

  useHeaderAction(
    <div className="relative flex-none">
      <HeaderButton onClick={() => setExportOpen((o) => !o)}>
        <ExportIcon size={15} />
        {exported ?? "Export"}
      </HeaderButton>
      {exportOpen && (
        <div className="popover-shadow absolute right-0 top-11 z-[60] w-[250px] overflow-hidden rounded-xl bg-surface">
          <div className="border-b border-divider px-3.5 py-2.5 text-[11.5px] tracking-wider text-muted uppercase">Export {range.toLowerCase()}</div>
          {[
            ["CSV", "CSV", "Rows for every sale in range"],
            ["Spreadsheet", "XLSX", "Summary and detail tabs"],
            ["PDF report", "PDF", "Charts and tables as shown"],
            ["Print", "PRN", "Send to the front desk printer"],
          ].map(([label, tag, hint]) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setExportOpen(false);
                setExported(label === "Print" ? "Sent to printer" : `${label} exported`);
              }}
              className="flex w-full items-center gap-2.5 border-b border-divider px-3.5 py-2.5 text-left text-[13.5px] last:border-b-0 hover:bg-row"
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-row text-[9.5px] font-bold text-muted">{tag}</span>
              <span className="min-w-0 flex-1">
                <span className="block">{label}</span>
                <span className="block text-[11.5px] text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>,
  );

  const maxMethod = Math.max(1, ...summary.paymentMethods.map((m) => m.total));

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">{isAdmin ? "Reports" : "My revenue"}</h2>
          <div className="text-[13.5px] text-muted">
            {RANGE_LABEL[range]} · {isAdmin ? "real data from sales and members" : "your sales and clients only"}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1 rounded-[11px] border border-divider p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] ${range === r ? "bg-row font-semibold text-fg" : "text-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <Card className="px-[18px] py-4">
          <div className="text-[11px] tracking-wider text-muted uppercase">Revenue</div>
          <div className="mt-1.5 text-[30px] font-semibold tabular-nums tracking-tight">{moneyRounded(summary.revenue)}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">{summary.saleCount} paid sale{summary.saleCount === 1 ? "" : "s"}</div>
        </Card>
        <Card className="px-[18px] py-4">
          <div className="text-[11px] tracking-wider text-muted uppercase">New members</div>
          <div className="mt-1.5 text-[30px] font-semibold tabular-nums tracking-tight">{summary.newMembers}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">joined in this range</div>
        </Card>
        <Card className="px-[18px] py-4">
          <div className="text-[11px] tracking-wider text-muted uppercase">Outstanding balance</div>
          <div className={`mt-1.5 text-[30px] font-semibold tabular-nums tracking-tight ${summary.outstandingBalance > 0 ? "text-bad" : ""}`}>
            {moneyRounded(summary.outstandingBalance)}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">{isAdmin ? "across all members, right now" : "across your clients, right now"}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Card className="px-[22px] py-5">
          <div className="mb-4 flex items-baseline justify-between gap-3.5">
            <h5 className="text-[15.5px] font-semibold">Revenue by payment method</h5>
            <span className="text-[12.5px] text-muted">{moneyRounded(summary.revenue)} total</span>
          </div>
          {summary.paymentMethods.length === 0 && <div className="py-6 text-center text-[13.5px] text-muted">No sales recorded in this range yet.</div>}
          <div className="flex flex-col gap-3">
            {summary.paymentMethods.map((m) => (
              <div key={m.method} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13.5px]">{m.method}</span>
                  <span className="flex-none text-[12.5px] tabular-nums text-muted">
                    {moneyRounded(m.total)} · {m.count} sale{m.count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-row">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, Math.round((m.total / maxMethod) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3.5">
            <h5 className="text-[15.5px] font-semibold">Top sellers</h5>
            <Link href="/pos" className="text-[13px] text-link hover:text-link-hover">
              Open POS
            </Link>
          </div>
          {summary.topSellers.length === 0 && <div className="py-6 text-center text-[13.5px] text-muted">Nothing sold in this range yet.</div>}
          {summary.topSellers.map((s) => (
            <div key={s.summary} className="flex items-center gap-3.5 border-b border-divider py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{s.summary}</span>
              <span className="w-14 flex-none text-right text-[12.5px] tabular-nums text-muted">{s.count} sold</span>
              <span className="w-[82px] flex-none text-right text-[13.5px] font-medium tabular-nums">{moneyRounded(s.total)}</span>
            </div>
          ))}
        </Card>

        {isAdmin && (
          <Card className="px-[22px] py-5">
            <div className="mb-1.5 flex items-baseline justify-between gap-3.5">
              <h5 className="text-[15.5px] font-semibold">Coach revenue</h5>
              <Link href="/schedule" className="text-[13px] text-link hover:text-link-hover">
                Open schedule
              </Link>
            </div>
            <div className="grid grid-cols-[minmax(0,1.4fr)_92px] gap-3 border-b border-divider px-0.5 py-2.5 text-[11px] tracking-wider text-muted uppercase">
              <span>Coach</span>
              <span className="text-right">Revenue</span>
            </div>
            {summary.coachShare.length === 0 && <div className="py-6 text-center text-[13.5px] text-muted">No coach-attributed sales yet.</div>}
            {summary.coachShare.map((c) => (
              <div key={c.coachId} className="grid grid-cols-[minmax(0,1.4fr)_92px] items-center gap-3 border-b border-divider py-3 last:border-b-0">
                <span className="min-w-0 truncate text-[13.5px]">{c.name}</span>
                <span className="text-right text-[13.5px] font-medium tabular-nums">{moneyRounded(c.total)}</span>
              </div>
            ))}
          </Card>
        )}

        <Card className="px-[22px] py-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3.5">
            <h5 className="text-[15.5px] font-semibold">Needs follow-up</h5>
            <span className="text-[12.5px] text-muted">balance due</span>
          </div>
          {followUp.length === 0 && <div className="py-6 text-center text-[13.5px] text-muted">Nobody has an outstanding balance right now.</div>}
          <div className="flex flex-col gap-2.5">
            {followUp.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5">
                <span className="h-[7px] w-[7px] flex-none rounded-full bg-bad" />
                <Link href={`/members/${m.id}`} className="min-w-0 flex-1 truncate text-[13.5px] hover:text-link">
                  {m.name}
                </Link>
                <span className="flex-none text-[12.5px] text-bad">{money(m.balance)} due</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className={`px-[22px] py-5 ${isAdmin ? "sm:col-span-2" : ""}`}>
          <h5 className="mb-1.5 text-[15.5px] font-semibold">Sessions &amp; attendance</h5>
          <div className="py-6 text-center text-[13.5px] text-pretty text-muted">
            Not available yet — session counts, utilization, and attendance reporting across the whole business hasn&apos;t
            been built yet.
          </div>
        </Card>
      </div>
    </div>
  );
}
