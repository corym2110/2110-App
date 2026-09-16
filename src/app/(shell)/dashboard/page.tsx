"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useScheduleRange, occurrencesOn } from "@/lib/useSchedule";
import { addDays, clock, DOW_LABELS, formatDateLong, isoOf, mondayOf, money, moneyRounded, slotKey, startOfToday } from "@/lib/time";
import { useMembers } from "@/lib/useMembers";
import { useCurrentCoach } from "@/lib/useCoaches";
import { getRevenueForRange, type DashboardRangeKey } from "@/server/sales";
import { upcomingBirthdays } from "@/lib/birthdays";

type Range = DashboardRangeKey;

function memberHref(name: string, members: { id: string; name: string }[]): string {
  const m = members.find((mm) => mm.name === name);
  return m ? `/members/${m.id}` : "/members";
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("Day");
  const members = useMembers();
  const coach = useCurrentCoach();
  const isAdmin = coach?.isAdmin ?? false;
  const today = useMemo(() => startOfToday(), []);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const firstName = coach?.name?.split(" ")[0] ?? "there";

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(mondayOf(today), i)), [today]);

  // Fetch one range wide enough to cover both "this week" and "this month" (they can spill into
  // neighbouring months at the edges), so Day/Week/Month all come from a single query.
  const { rangeFromIso, rangeToIso, daysInMonth } = useMemo(() => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    const from = weekStart < monthStart ? weekStart : monthStart;
    const to = weekEnd > monthEnd ? weekEnd : monthEnd;
    return { rangeFromIso: isoOf(from), rangeToIso: isoOf(to), daysInMonth: monthEnd.getDate() };
  }, [today, weekDays]);

  const scheduleData = useScheduleRange(rangeFromIso, rangeToIso, isAdmin ? undefined : coach?.id);
  const { attendance } = scheduleData;

  const occurrences = occurrencesOn(scheduleData, isoOf(today));

  const weekOverview = weekDays.map((d) => ({
    date: d,
    label: DOW_LABELS[(d.getDay() + 6) % 7],
    count: occurrencesOn(scheduleData, isoOf(d)).length,
  }));
  const maxWeekCount = Math.max(1, ...weekOverview.map((d) => d.count));
  const sessionsThisWeek = weekOverview.reduce((a, d) => a + d.count, 0);

  let sessionsThisMonth = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    sessionsThisMonth += occurrencesOn(scheduleData, isoOf(new Date(today.getFullYear(), today.getMonth(), i))).length;
  }

  const completedToday = occurrences.filter((o) => {
    const status = attendance[slotKey(o.iso, o.start, o.coach, o.roster ? "" : o.name)];
    const missed = status === "No-show" || status === "Late cancel" || status === "Cancelled";
    return !missed && o.start + o.duration <= nowMin;
  }).length;

  const sessionsByRange: Record<Range, { label: string; value: number; sub: string }> = {
    Day: { label: "Sessions today", value: occurrences.length, sub: `${completedToday} completed` },
    Week: { label: "Sessions this week", value: sessionsThisWeek, sub: "" },
    Month: { label: "Sessions this month", value: sessionsThisMonth, sub: "" },
  };
  const revLabelByRange: Record<Range, string> = { Day: "Revenue today", Week: "Revenue this week", Month: "Revenue MTD" };

  const [revenue, setRevenue] = useState({ revenue: 0, saleCount: 0 });
  useEffect(() => {
    if (coach === undefined) return;
    let cancelled = false;
    getRevenueForRange(range, isAdmin ? undefined : coach?.id).then((r) => {
      if (!cancelled) setRevenue(r);
    });
    return () => {
      cancelled = true;
    };
  }, [range, coach, isAdmin]);

  const balanceDue = members
    .filter((m) => m.balance > 0 && (isAdmin || m.coach === coach?.name))
    .sort((a, b) => b.balance - a.balance);
  const outstandingBalance = balanceDue.reduce((a, m) => a + m.balance, 0);

  const myClients = members.filter((m) => isAdmin || m.coach === coach?.name);
  const birthdays = upcomingBirthdays(myClients, 14, today);

  const sessions = sessionsByRange[range];

  return (
    <>
      <div className="flex items-end justify-between gap-5">
        <div>
          <h2 className="m-0 text-[28px] font-medium tracking-tight">Good morning, {firstName}</h2>
          <div className="text-[13.5px] text-muted">
            {formatDateLong(today)} · {occurrences.length} sessions booked
          </div>
        </div>
        <SegmentedControl options={["Day", "Week", "Month"] as const} value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {[
          { label: sessions.label, value: String(sessions.value), sub: sessions.sub, href: "/schedule" },
          { label: "Active members", value: String(members.length), sub: members.length === 0 ? "No members yet" : "", href: "/members" },
          { label: revLabelByRange[range], value: moneyRounded(revenue.revenue), sub: `${revenue.saleCount} sale${revenue.saleCount === 1 ? "" : "s"}`, href: "/reports" },
          {
            label: "Outstanding balance",
            value: moneyRounded(outstandingBalance),
            sub: isAdmin ? "across all members" : "across your clients",
            href: "/reports",
          },
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
              const status = attendance[slotKey(o.iso, o.start, o.coach, o.roster ? "" : o.name)];
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
                    href={isGroup ? "/schedule" : memberHref(title, members)}
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
            {balanceDue.slice(0, 4).map((m) => (
              <Link key={m.id} href={`/members/${m.id}`} className="-mx-2 flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-row">
                <span className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full bg-bad" />
                <span>
                  <span className="block text-[13.5px]">{m.name}</span>
                  <span className="block text-xs text-muted">{money(m.balance)} balance due</span>
                </span>
              </Link>
            ))}
            {balanceDue.length === 0 && <div className="text-[13px] text-muted">Nothing needs attention right now.</div>}
          </Card>

          <Card className="flex flex-1 flex-col gap-3.5 px-[22px] py-5">
            <div className="flex items-center justify-between">
              <h5 className="text-[15.5px] font-semibold">This week</h5>
              <span className="text-[12.5px] text-muted">{sessionsThisWeek} sessions</span>
            </div>
            <div className="grid flex-1 grid-cols-7 items-end gap-2">
              {weekOverview.map((d) => (
                <Link key={d.label} href="/schedule" className="flex h-full flex-col items-center gap-2 text-fg hover:opacity-80">
                  <span className="flex-none text-[11.5px] tabular-nums text-muted">{d.count}</span>
                  <span className="flex min-h-0 w-full flex-1 items-end">
                    <span
                      className={`w-full flex-none rounded-t-lg rounded-b-[3px] ${isoOf(d.date) === isoOf(today) ? "bg-accent" : "bg-accent/30"}`}
                      style={{ height: `${Math.max(4, Math.round((d.count / maxWeekCount) * 100))}%` }}
                    />
                  </span>
                  <span className="flex-none text-[11.5px] text-muted">{d.label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col gap-3 px-[22px] py-5">
          <div className="flex items-center justify-between">
            <h5 className="text-[15.5px] font-semibold">Upcoming birthdays</h5>
            <span className="text-[12.5px] text-muted">next 14 days</span>
          </div>
          {birthdays.map((b) => (
            <Link key={b.memberId} href={`/members/${b.memberId}`} className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-row">
              <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-row text-[13px]">🎂</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{b.name}</span>
              <span className="flex-none text-xs text-muted">{b.daysAway === 0 ? "Today" : b.daysAway === 1 ? "Tomorrow" : `In ${b.daysAway} days`}</span>
            </Link>
          ))}
          {birthdays.length === 0 && <div className="text-[13px] text-pretty text-muted">No birthdays in the next two weeks.</div>}
        </Card>
      </div>
    </>
  );
}
