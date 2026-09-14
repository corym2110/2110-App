"use client";

import { Fragment, useState } from "react";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { XIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useThemeStore } from "@/stores/theme";
import { useAvailabilityStore, EMPTY_AVAILABILITY } from "@/stores/availability";
import { useCurrentCoach } from "@/lib/useCoaches";
import { DAYS_OF_WEEK } from "@/data/mock/coaches";
import { clock, initialsOf, parseClock } from "@/lib/time";
import type { TimeOffEntry } from "@/types";

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 300; m <= 1320; m += 30) out.push(clock(m));
  return out;
})();

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

function fmtRange(from: string, to: string): string {
  return from === to ? prettyDate(from) : `${prettyDate(from)} – ${prettyDate(to)}`;
}

export default function CoachPreferencesPage() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.set);
  const coach = useCurrentCoach();
  const coachId = coach?.id ?? "";
  const avail = useAvailabilityStore((s) => s.byCoach[coachId]) ?? EMPTY_AVAILABILITY;
  const setDayHours = useAvailabilityStore((s) => s.setDayHours);
  const setTimeOff = useAvailabilityStore((s) => s.setTimeOff);

  const [saved, setSaved] = useState(false);
  const [flags, setFlags] = useState({ dayAhead: true, manualBooking: true, classJoin: true });
  const [landing, setLanding] = useState("Dashboard");
  const [calView, setCalView] = useState("Week");
  const [offFrom, setOffFrom] = useState("");
  const [offTo, setOffTo] = useState("");
  const [offReasonText, setOffReasonText] = useState("");
  const [offType, setOffType] = useState<TimeOffEntry["type"]>("Full days");

  useHeaderAction(
    <HeaderButton onClick={() => setSaved(true)}>{saved ? "Saved" : "Save preferences"}</HeaderButton>,
  );

  const onDays = DAYS_OF_WEEK.filter((d) => avail.hours[d].on);
  const totalHours = onDays.reduce((a, d) => a + (avail.hours[d].end - avail.hours[d].start) / 60, 0);
  const hoursSummary = onDays.length === 0 ? "No days set" : `${onDays.length} days · ${Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}h a week`;

  function addTimeOff() {
    if (!offFrom || !coachId) return;
    const entry: TimeOffEntry = { from: offFrom, to: offTo || offFrom, reason: offReasonText.trim() || "Time off", type: offType };
    const next = [...avail.timeOff, entry].sort((a, b) => a.from.localeCompare(b.from));
    setTimeOff(coachId, next);
    setOffFrom("");
    setOffTo("");
    setOffReasonText("");
    setSaved(false);
  }

  if (coach === undefined) {
    return <div className="py-10 text-center text-[13.5px] text-muted">Loading your preferences…</div>;
  }
  if (coach === null) {
    return (
      <div className="py-10 text-center text-[13.5px] text-pretty text-muted">
        Your account isn&apos;t linked to a coach record yet — ask an admin to add you under Settings → Staff with this
        same email address.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Card className="flex flex-wrap items-start gap-[18px] px-6 py-[22px]">
        <div className="grid h-16 w-16 flex-none place-items-center rounded-full bg-accent-deep text-[21px] font-semibold text-[#e7e5fe]">
          {initialsOf(coach.name)}
        </div>
        <div className="min-w-[220px] flex-1">
          <h2 className="m-0 text-[27px] font-medium tracking-tight">{coach.name}</h2>
          <div className="mt-0.5 text-[13.5px] text-muted">
            {coach.isAdmin ? "Admin" : "Coach"} · {coach.email}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-row px-2.5 py-1 text-[12.5px]">{coach.isAdmin ? "Full access" : "Coach access"}</span>
            <span className={`rounded-full px-2.5 py-1 text-[12.5px] ${coach.active ? "bg-row text-muted" : "bg-bad/10 text-bad"}`}>
              {coach.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">
        <Card className="flex flex-col gap-3.5 px-[22px] py-5">
          <h5 className="text-[15.5px] font-semibold">Schedule preferences</h5>
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div className="text-[13.5px] font-semibold">My weekly hours</div>
              <span className="text-xs text-muted">{hoursSummary}</span>
            </div>
            <div className="grid grid-cols-[64px_minmax(0,1fr)_12px_minmax(0,1fr)_34px] items-center gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const h = avail.hours[d];
                const span = (h.end - h.start) / 60;
                return (
                  <Fragment key={d}>
                    <button
                      type="button"
                      onClick={() => setDayHours(coachId, d, { on: !h.on })}
                      className={`h-[34px] rounded-lg border text-[13px] ${
                        h.on ? "border-accent bg-row font-semibold" : "border-divider font-normal text-muted"
                      }`}
                    >
                      {d}
                    </button>
                    <Select
                      value={clock(h.start)}
                      disabled={!h.on}
                      onChange={(v) => {
                        const mins = parseClock(v);
                        setDayHours(coachId, d, { start: mins, end: Math.max(mins + 60, h.end) });
                      }}
                      options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                      className="h-[34px] min-w-0 rounded-lg px-1.5 text-[13px]"
                    />
                    <span className="text-center text-xs text-muted" style={{ opacity: h.on ? 1 : 0.45 }}>
                      –
                    </span>
                    <Select
                      value={clock(h.end)}
                      disabled={!h.on}
                      onChange={(v) => {
                        const mins = parseClock(v);
                        setDayHours(coachId, d, { end: mins, start: Math.min(h.start, mins - 60) });
                      }}
                      options={TIME_OPTIONS.map((t) => ({ value: t, label: t }))}
                      className="h-[34px] min-w-0 rounded-lg px-1.5 text-[13px]"
                    />
                    <span className="text-right text-[11.5px] tabular-nums text-muted" style={{ opacity: h.on ? 1 : 0.45 }}>
                      {h.on ? (Number.isInteger(span) ? `${span}h` : `${span.toFixed(1)}h`) : "Off"}
                    </span>
                  </Fragment>
                );
              })}
            </div>
            <div className="mt-2.5 text-xs text-pretty text-muted">Tap a day to mark it off. Changes apply to your own calendar right away.</div>
          </div>

          <div className="h-px bg-divider" />

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div className="text-[13.5px] font-semibold">Time off</div>
              <span className="text-xs text-muted">Auto-approved</span>
            </div>
            <div className="flex flex-col gap-2">
              {avail.timeOff.map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-row px-3 py-2.5">
                  <span className="h-[7px] w-[7px] flex-none rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px]">{fmtRange(t.from, t.to)}</div>
                    <div className="truncate text-xs text-muted">{t.type === "Partial day" ? `${t.reason} · partial day` : t.reason}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimeOff(coachId, avail.timeOff.filter((_, j) => j !== i))}
                    title="Remove"
                    className="grid h-7 w-7 flex-none place-items-center rounded-lg text-muted hover:bg-divider hover:text-bad"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
              {avail.timeOff.length === 0 && <div className="px-0.5 py-2.5 text-[13px] text-muted">No time off booked.</div>}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">From</span>
                <input
                  type="date"
                  value={offFrom}
                  onChange={(e) => setOffFrom(e.target.value)}
                  className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">To</span>
                <input
                  type="date"
                  value={offTo}
                  onChange={(e) => setOffTo(e.target.value)}
                  className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
            </div>
            <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,150px)] gap-2.5">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Reason</span>
                <input
                  value={offReasonText}
                  onChange={(e) => setOffReasonText(e.target.value)}
                  placeholder="Vacation, course, out of office"
                  className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Type</span>
                <Select
                  value={offType}
                  onChange={(v) => setOffType(v as TimeOffEntry["type"])}
                  options={[
                    { value: "Full days", label: "Full days" },
                    { value: "Partial day", label: "Partial day" },
                  ]}
                  className="h-[38px] rounded-lg px-2 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={addTimeOff}
              className="mt-3 h-[38px] rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent"
            >
              Block this time off
            </button>
          </div>
        </Card>

        <div className="flex flex-col gap-[18px]">
        <Card className="flex flex-col gap-3.5 px-[22px] py-5">
          <h5 className="text-[15.5px] font-semibold">Account</h5>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Display name</span>
              <input key={coach.name} defaultValue={coach.name} className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Mobile</span>
              <input placeholder="Not on file" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Email</span>
            <input key={coach.email} defaultValue={coach.email} className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Password</span>
            <input type="password" defaultValue="••••••••" readOnly className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm tracking-[.14em]" />
          </label>
          <div className="mt-0.5 flex flex-wrap gap-2">
            <button type="button" className="h-[38px] rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">Change password</button>
            <button type="button" className="h-[38px] rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">Reset password</button>
            <button type="button" className="h-[38px] rounded-full border border-divider px-4 text-[13.5px] text-bad hover:bg-row">Sign out</button>
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-1 text-[15.5px] font-semibold">My notifications</h5>
          {[
            { key: "dayAhead" as const, label: "Tomorrow's schedule", hint: "Sent the night before with my session list" },
            { key: "manualBooking" as const, label: "New manual bookings", hint: "When a member books a session with me themselves" },
            { key: "classJoin" as const, label: "Class sign-ups", hint: "When someone joins one of my classes" },
          ].map((t) => (
            <div key={t.key} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px]">{t.label}</div>
                <div className="text-pretty text-xs text-muted">{t.hint}</div>
              </div>
              <Toggle on={flags[t.key]} onClick={() => setFlags((f) => ({ ...f, [t.key]: !f[t.key] }))} label={t.label} />
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3.5 px-[22px] py-5">
          <h5 className="text-[15.5px] font-semibold">Appearance</h5>
          <div>
            <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Theme</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(["light", "dark"] as const).map((t) => {
                const on = t === theme;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`h-[38px] rounded-lg border text-[13.5px] capitalize hover:bg-row ${
                      on ? "border-accent bg-row font-semibold" : "border-divider font-normal"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 text-pretty text-xs text-muted">Saved to this coach&apos;s profile and applied on every screen.</div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Landing screen</span>
            <Select
              value={landing}
              onChange={setLanding}
              options={["Dashboard", "Schedule", "Members", "POS", "Reports"].map((v) => ({ value: v, label: v }))}
              className="h-[38px] rounded-lg px-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Default calendar view</span>
            <Select
              value={calView}
              onChange={setCalView}
              options={["Day", "Week", "Month"].map((v) => ({ value: v, label: v }))}
              className="h-[38px] rounded-lg px-2 text-sm"
            />
          </label>
        </Card>
        </div>
      </div>
    </div>
  );
}
