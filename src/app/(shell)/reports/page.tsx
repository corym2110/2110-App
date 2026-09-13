"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { ExportIcon } from "@/components/ui/icons";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useThemeStore } from "@/stores/theme";
import { MEMBERS } from "@/data/mock/members";
import { sessionTypeColor } from "@/data/mock/sessionTypes";
import {
  REPORT_SETS,
  SESSION_TYPE_SHARE,
  COACH_SHARE,
  COACH_UTIL,
  RETENTION,
  FOLLOW_UP,
  TOP_SELLERS,
  type ReportRange,
} from "@/data/mock/reports";
import { moneyRounded } from "@/lib/time";
import type { SessionTypeName } from "@/types";

const RANGES: ReportRange[] = ["This week", "This month", "Last 90 days", "Year to date"];

const TONE_CLASS: Record<string, string> = {
  good: "text-ok",
  bad: "text-bad",
  warn: "text-amber-500",
  text: "text-fg",
};

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("This week");
  const [exportOpen, setExportOpen] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const dark = useThemeStore((s) => s.theme === "dark");

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
            ["CSV", "CSV", "Rows for every session in range"],
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

  const set = REPORT_SETS[range];
  const max = Math.max(...set.bars.map(([, v]) => v));
  const revTotal = set.bars.reduce((a, [, v]) => a + v, 0);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Reports</h2>
          <div className="text-[13.5px] text-muted">{set.label}</div>
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
        {set.kpis.map(([label, value, delta, tone]) => (
          <Card key={label} className="px-[18px] py-4">
            <div className="text-[11px] tracking-wider text-muted uppercase">{label}</div>
            <div className="mt-1.5 text-[30px] font-semibold tabular-nums tracking-tight">
              {typeof value === "number" && label === "Revenue" ? moneyRounded(value) : value}
            </div>
            <div className={`mt-0.5 text-[12.5px] ${tone ? "text-ok" : "text-muted"}`}>{delta}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] items-start gap-[18px]">
        <Card className="px-[22px] py-5">
          <div className="mb-4 flex items-baseline justify-between gap-3.5">
            <h5 className="text-[15.5px] font-semibold">Revenue</h5>
            <span className="text-[12.5px] text-muted">{moneyRounded(revTotal)} total</span>
          </div>
          <div className="grid h-[210px] items-end gap-2.5" style={{ gridTemplateColumns: `repeat(${set.bars.length}, minmax(0, 1fr))` }}>
            {set.bars.map(([label, value], i) => (
              <div key={label} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
                <span className="text-[10.5px] tabular-nums text-muted">{moneyRounded(value)}</span>
                <div
                  className={`w-full rounded-t-lg rounded-b-[3px] ${i === set.bars.length - 1 ? "bg-accent" : "bg-accent/30"}`}
                  style={{ height: `${Math.max(6, Math.round((value / max) * 100))}%` }}
                />
                <span className="whitespace-nowrap text-[11px] text-muted">{label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <div className="mb-4 flex items-baseline justify-between gap-3.5">
            <h5 className="text-[15.5px] font-semibold">Sessions by type</h5>
            <span className="text-[12.5px] text-muted">{set.sessions} sessions</span>
          </div>
          <div className="flex flex-col gap-3">
            {SESSION_TYPE_SHARE.map(([label, pct]) => (
              <div key={label} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13.5px]">{label}</span>
                  <span className="flex-none text-[12.5px] tabular-nums text-muted">
                    {pct}% · {Math.round((set.sessions * pct) / 100)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-row">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sessionTypeColor(label as SessionTypeName, dark) }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3.5">
            <h5 className="text-[15.5px] font-semibold">Coach performance</h5>
            <Link href="/schedule" className="text-[13px] text-link hover:text-link-hover">
              Open schedule
            </Link>
          </div>
          <div className="grid grid-cols-[minmax(0,1.4fr)_76px_88px_92px] gap-3 border-b border-divider px-0.5 py-2.5 text-[11px] tracking-wider text-muted uppercase">
            <span>Coach</span>
            <span className="text-right">Sessions</span>
            <span className="text-right">Utilization</span>
            <span className="text-right">Revenue</span>
          </div>
          {COACH_SHARE.map(([name, id, share]) => {
            const util = COACH_UTIL[id];
            return (
              <div key={id} className="grid grid-cols-[minmax(0,1.4fr)_76px_88px_92px] items-center gap-3 border-b border-divider py-3 last:border-b-0">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-row text-[11px] font-semibold text-muted">{id}</span>
                  <span className="min-w-0 truncate text-[13.5px]">{name}</span>
                </span>
                <span className="text-right text-[13.5px] tabular-nums">{Math.round(set.sessions * share)}</span>
                <span className={`text-right text-[13.5px] tabular-nums ${util >= 85 ? "text-ok" : util >= 75 ? "text-fg" : "text-amber-500"}`}>{util}%</span>
                <span className="text-right text-[13.5px] font-medium tabular-nums">{moneyRounded(Math.round(revTotal * share))}</span>
              </div>
            );
          })}
        </Card>

        <Card className="px-[22px] py-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3.5">
            <h5 className="text-[15.5px] font-semibold">Attendance &amp; retention</h5>
            <span className="text-[12.5px] text-muted">{range.toLowerCase()}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 pt-2 text-[13.5px]">
            {RETENTION.map(([label, value, tone]) => (
              <Fragment key={label}>
                <span className="text-muted">{label}</span>
                <span className={`text-right tabular-nums ${TONE_CLASS[tone]}`}>{value}</span>
              </Fragment>
            ))}
          </div>
          <div className="my-4 h-px bg-divider" />
          <div className="mb-2.5 text-[11px] tracking-wider text-muted uppercase">Needs follow-up</div>
          <div className="flex flex-col gap-2.5">
            {FOLLOW_UP.map(([name, reason, tone]) => (
              <div key={name} className="flex items-center gap-2.5">
                <span className={`h-[7px] w-[7px] flex-none rounded-full ${tone === "bad" ? "bg-bad" : "bg-amber-500"}`} />
                <Link href={`/members/${MEMBERS.find((m) => m.name === name)?.id ?? ""}`} className="min-w-0 flex-1 truncate text-[13.5px] hover:text-link">
                  {name}
                </Link>
                <span className="flex-none text-[12.5px] text-muted">{reason}</span>
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
          {TOP_SELLERS.map(([name, units, total]) => (
            <div key={name} className="flex items-center gap-3.5 border-b border-divider py-2.5 last:border-b-0">
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{name}</span>
              <span className="w-14 flex-none text-right text-[12.5px] tabular-nums text-muted">{units} sold</span>
              <span className="w-[82px] flex-none text-right text-[13.5px] font-medium tabular-nums">{moneyRounded(total)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
