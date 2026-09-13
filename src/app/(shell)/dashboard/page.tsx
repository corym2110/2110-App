"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useBookingsStore } from "@/stores/bookings";
import { useAttendanceStore } from "@/stores/attendance";
import { occurrencesForDate } from "@/lib/scheduleEngine";
import { clock, formatDateLong, startOfToday } from "@/lib/time";
import { memberByName } from "@/data/mock/members";

type Range = "Day" | "Week" | "Month";

const STATS_BY_RANGE: Record<Range, { sessionsLabel: string; sessions: string; sessionsSub: string; utilization: string; revLabel: string; revenue: string; revSub: string }> = {
  Day: { sessionsLabel: "Sessions today", sessions: "6", sessionsSub: "2 completed", utilization: "86%", revLabel: "Revenue today", revenue: "$540", revSub: "vs $480 last Wednesday" },
  Week: { sessionsLabel: "Sessions this week", sessions: "28", sessionsSub: "9 completed", utilization: "80%", revLabel: "Revenue this week", revenue: "$2,460", revSub: "vs $2,180 last week" },
  Month: { sessionsLabel: "Sessions this month", sessions: "112", sessionsSub: "9 completed", utilization: "83%", revLabel: "Revenue MTD", revenue: "$4,280", revSub: "vs $3,910 last month" },
};

const ATTENTION: { title: string; sub: string; dot: string; href: string }[] = [
  { title: "Marcus Ellis cancelled 8:30 AM", sub: "Third cancellation this month", dot: "bg-bad", href: "/members/marcus-ellis" },
  { title: "2 packages expiring this week", sub: "Priya Raman, Dan Whitfield", dot: "bg-amber-500", href: "/members" },
  { title: "3:00 PM slot is open", sub: "4 members on the waitlist", dot: "bg-accent", href: "/schedule" },
];

const WEEK_OVERVIEW = [
  { label: "Mon", count: 7, pct: 100 },
  { label: "Tue", count: 5, pct: 72 },
  { label: "Wed", count: 6, pct: 86, today: true },
  { label: "Thu", count: 4, pct: 58 },
  { label: "Fri", count: 6, pct: 86 },
];

function memberHref(name: string): string {
  const m = memberByName(name);
  return m ? `/members/${m.id}` : "/members";
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("Day");
  const { bookings, series, moves } = useBookingsStore();
  const statuses = useAttendanceStore((s) => s.statuses);
  const today = useMemo(() => startOfToday(), []);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const occurrences = useMemo(
    () => occurrencesForDate(today, moves, bookings, series),
    [today, moves, bookings, series],
  );

  const stats = STATS_BY_RANGE[range];

  return (
    <>
      <div className="flex items-end justify-between gap-5">
        <div>
          <h2 className="m-0 text-[28px] font-medium tracking-tight">Good morning, Cory</h2>
          <div className="text-[13.5px] text-muted">
            {formatDateLong(today)} · {occurrences.length} sessions booked
          </div>
        </div>
        <SegmentedControl options={["Day", "Week", "Month"] as const} value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {[
          { label: stats.sessionsLabel, value: stats.sessions, sub: stats.sessionsSub, href: "/schedule" },
          { label: "Active members", value: "148", sub: "+6 this month", href: "/members" },
          { label: "Utilization", value: stats.utilization, sub: "of coached hours", href: "/reports" },
          { label: stats.revLabel, value: stats.revenue, sub: stats.revSub, href: "/reports" },
        ].map((c) => (
          <Link key={c.label} href={c.href} className="card-shadow block rounded-[14px] bg-surface px-[18px] py-4 hover:bg-row">
            <div className="text-[11px] tracking-wider text-muted uppercase">{c.label}</div>
            <div className="mt-1.5 text-[30px] font-semibold tracking-tight">{c.value}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{c.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(430px,1fr))] gap-[18px]">
        <Card className="flex flex-col gap-3.5 px-[22px] py-5">
          <div className="flex items-center justify-between">
            <h5 className="text-[15.5px] font-semibold">Today&apos;s schedule</h5>
            <Link href="/schedule" className="text-[13px] text-link hover:text-link-hover">
              View full calendar
            </Link>
          </div>

          <div className="flex flex-1 flex-col">
            {occurrences.map((o) => {
              const attKey = `${o.iso}-${o.start}-${o.coach}-`;
              const status = statuses[attKey + (o.roster ? "" : o.name)];
              const missed = status === "No-show" || status === "Late cancel" || status === "Cancelled";
              const completed = !missed && o.start + o.duration <= nowMin;
              const upNext = !missed && o.start <= nowMin && o.start + o.duration > nowMin;
              const label: string = status ?? (missed ? "Cancelled" : completed ? "Completed" : upNext ? "Up next" : "Booked");
              const chipClass =
                label === "Completed" || label === "Checked in"
                  ? "bg-ok/15 text-ok"
                  : missed
                    ? "bg-row text-muted"
                    : "bg-accent/15 text-accent";
              const isGroup = !!o.roster?.length;
              const title = isGroup ? `${o.name || "Group Training"} (${o.roster!.length})` : o.name;
              return (
                <div key={o.key} className="flex items-center gap-4 border-b border-divider py-2.5">
                  <span className="w-[104px] flex-none truncate text-[13.5px] tabular-nums text-muted">{clock(o.start)}</span>
                  <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-row text-[10.5px] font-semibold text-muted">
                    {isGroup ? "GR" : title.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <Link
                    href={isGroup ? "/schedule" : memberHref(title)}
                    className="min-w-0 flex-1 truncate text-sm text-fg hover:text-link"
                  >
                    {title}
                  </Link>
                  <span className="w-[132px] flex-none truncate text-[12.5px] text-muted">{o.type}</span>
                  <span className={`w-[78px] flex-none rounded-md py-0.5 text-center text-[11.5px] ${chipClass}`}>{label}</span>
                </div>
              );
            })}
            {occurrences.length === 0 && <div className="py-6 text-center text-[13.5px] text-muted">Nothing on today&apos;s schedule.</div>}
          </div>
        </Card>

        <div className="grid grid-rows-[auto_minmax(200px,1fr)] gap-[18px]">
          <Card className="flex flex-col gap-3 px-[22px] py-5">
            <h5 className="text-[15.5px] font-semibold">Needs attention</h5>
            {ATTENTION.map((a) => (
              <Link key={a.title} href={a.href} className="-mx-2 flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-row">
                <span className={`mt-1.5 h-[7px] w-[7px] flex-none rounded-full ${a.dot}`} />
                <span>
                  <span className="block text-[13.5px]">{a.title}</span>
                  <span className="block text-xs text-muted">{a.sub}</span>
                </span>
              </Link>
            ))}
          </Card>

          <Card className="flex flex-1 flex-col gap-3.5 px-[22px] py-5">
            <div className="flex items-center justify-between">
              <h5 className="text-[15.5px] font-semibold">This week</h5>
              <span className="text-[12.5px] text-muted">28 of 35 slots</span>
            </div>
            <div className="grid flex-1 grid-cols-5 items-end gap-3">
              {WEEK_OVERVIEW.map((d) => (
                <Link key={d.label} href="/schedule" className="flex h-full flex-col items-center gap-2 text-fg hover:opacity-80">
                  <span className="flex-none text-[11.5px] tabular-nums text-muted">{d.count}</span>
                  <span className="flex min-h-0 w-full flex-1 items-end">
                    <span
                      className={`w-full flex-none rounded-t-lg rounded-b-[3px] ${d.today ? "bg-accent" : "bg-accent/30"}`}
                      style={{ height: `${d.pct}%` }}
                    />
                  </span>
                  <span className="flex-none text-[11.5px] text-muted">{d.label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
