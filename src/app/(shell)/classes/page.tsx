"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { XIcon, PlusIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { useThemeStore } from "@/stores/theme";
import { useScheduleRange, occurrencesOn } from "@/lib/useSchedule";
import { BookingDialog } from "@/components/schedule/BookingDialog";
import { setAttendanceStatus, addToClass, addToWaitlist, removeFromWaitlist, promoteFromWaitlist } from "@/server/schedule";
import { addDays, clock, formatDateShort, formatDateLong, initialsOf, isoOf, mondayOf, slotKey, startOfToday } from "@/lib/time";
import { capacityOf, sessionTypeColor } from "@/data/mock/sessionTypes";
import { useMembers } from "@/lib/useMembers";
import { useCoaches } from "@/lib/useCoaches";
import type { AttendanceStatus, SessionTypeName } from "@/types";

const KINDS: SessionTypeName[] = ["Class", "Group Training"];

export default function ClassesPage() {
  const [offset, setOffset] = useState(0);
  const [kinds, setKinds] = useState<Record<string, boolean>>({ Class: true, "Group Training": true });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [addPick, setAddPick] = useState("");
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [, startTransition] = useTransition();

  const dark = useThemeStore((s) => s.theme === "dark");
  const members = useMembers();
  const coaches = useCoaches();
  const coachName = (id: string) => coaches.find((c) => c.id === id)?.name ?? id;

  const weekStart = useMemo(() => addDays(mondayOf(startOfToday()), offset * 7), [offset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const scheduleData = useScheduleRange(isoOf(weekStart), isoOf(addDays(weekStart, 6)));
  const { attendance, waitlists, classAdds } = scheduleData;

  const dayGroups = days
    .map((date) => ({ date, occ: occurrencesOn(scheduleData, isoOf(date)).filter((o) => kinds[o.type]) }))
    .filter((g) => g.occ.length > 0);

  let selected: ReturnType<typeof occurrencesOn>[number] | undefined;
  for (const g of dayGroups) {
    const hit = g.occ.find((o) => o.key === selectedKey);
    if (hit) selected = hit;
  }

  function setStatus(key: string, iso: string, status: AttendanceStatus | null) {
    startTransition(async () => {
      await setAttendanceStatus(key, iso, status);
      scheduleData.refetch();
    });
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Classes</h2>
          <div className="text-[13.5px] text-muted">
            {formatDateShort(weekStart)} – {formatDateShort(addDays(weekStart, 6))}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAddClassOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
          >
            <PlusIcon size={14} />
            Add class
          </button>
          <div className="flex gap-1 rounded-[11px] border border-divider p-1">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKinds((s) => ({ ...s, [k]: !s[k] }))}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] ${kinds[k] ? "bg-row font-semibold text-fg" : "text-muted"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setOffset(0)} className="h-9 rounded-[10px] border border-divider px-3.5 text-[13px] hover:bg-row">
              This week
            </button>
            <button type="button" onClick={() => setOffset((o) => o - 1)} className="grid h-9 w-9 place-items-center rounded-[10px] border border-divider text-muted hover:bg-row hover:text-fg">
              ←
            </button>
            <button type="button" onClick={() => setOffset((o) => o + 1)} className="grid h-9 w-9 place-items-center rounded-[10px] border border-divider text-muted hover:bg-row hover:text-fg">
              →
            </button>
          </div>
        </div>
      </div>

      {dayGroups.map(({ date, occ }) => (
        <section key={isoOf(date)} className="flex flex-col gap-2.5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[13px] font-semibold">{formatDateLong(date)}</span>
            <span className="text-xs text-muted">
              {occ.length} {occ.length === 1 ? "session" : "sessions"}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(268px,1fr))] gap-3">
            {occ.map((o) => {
              const cap = capacityOf(o.type, o.name, o.capacity);
              const roster = [...(o.roster ?? []), ...(classAdds[o.key] ?? [])];
              const head = roster.length;
              const full = cap > 0 && head >= cap;
              const waiting = waitlists[o.key] ?? [];
              const checkedIn = roster.filter((n) => attendance[slotKey(o.iso, o.start, o.coach, n)] === "Checked in").length;
              const color = sessionTypeColor(o.type, dark);
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setSelectedKey(o.key)}
                  className={`card-shadow flex flex-col gap-2.5 rounded-2xl bg-surface px-[15px] py-3.5 text-left ${
                    selectedKey === o.key ? "border border-accent" : "border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-[30px] w-[3px] flex-none rounded-full" style={{ background: color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{o.name || "Group Training"}</span>
                      <span className="block text-[12.5px] tabular-nums text-muted">
                        {clock(o.start)} · {coachName(o.coach)}
                      </span>
                    </span>
                    {full && <span className="flex-none rounded-md bg-bad/15 px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-bad">FULL</span>}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                      <span>
                        {cap ? `${head} of ${cap}` : head}
                        {o.type === "Class" ? " signed in" : " booked"}
                      </span>
                      <span className={full ? "text-bad" : "text-muted"}>
                        {cap ? (full ? "Full" : `${cap - head} spot${cap - head === 1 ? "" : "s"} left`) : ""}
                      </span>
                    </div>
                    <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-row">
                      <div className="h-full" style={{ width: cap ? `${Math.min(100, Math.round((head / cap) * 100))}%` : "0%", background: full ? "var(--color-bad)" : color }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                    {checkedIn > 0 && <span className="rounded-md bg-ok/15 px-2 py-0.5 font-medium text-ok">{checkedIn} checked in</span>}
                    {waiting.length > 0 && <span className="rounded-md bg-row px-2 py-0.5">{waiting.length} on the waitlist</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {dayGroups.length === 0 && (
        <Card className="card-shadow px-5 py-11 text-center text-[13.5px] text-muted">No classes on the schedule this week.</Card>
      )}

      {selected && (
        <div className="panel-shadow fixed bottom-0 right-0 top-16 z-50 flex w-[352px] max-w-full flex-col overflow-y-auto border-l border-divider bg-surface">
          <div className="flex items-start gap-3 px-5 pt-[18px]">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-medium tracking-tight">{selected.name || "Group Training"}</div>
              <div className="mt-0.5 text-[13px] text-muted">
                {formatDateLong(new Date(`${selected.iso}T00:00:00`))} · {clock(selected.start)}
              </div>
            </div>
            <button type="button" onClick={() => setSelectedKey(null)} className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
              <XIcon size={16} />
            </button>
          </div>

          <div className="px-5 pt-3 text-[13.5px] text-muted">
            Coach <span className="text-fg">{coachName(selected.coach)}</span>
          </div>

          <div className="px-5 pt-4">
            <div className="flex flex-col gap-1.5">
              {[...(selected.roster ?? []), ...(classAdds[selected.key] ?? [])].map((n) => {
                const key = slotKey(selected!.iso, selected!.start, selected!.coach, n);
                const status = attendance[key];
                const member = members.find((m) => m.name === n);
                return (
                  <div key={n} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStatus(key, selected!.iso, status === "Checked in" ? null : "Checked in")}
                      title="Check in"
                      className={`grid h-9 w-8 flex-none place-items-center rounded-[9px] border hover:bg-row ${
                        status === "Checked in" ? "border-ok bg-ok/15 text-ok" : "border-divider text-muted"
                      }`}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(key, selected!.iso, status === "No-show" ? null : "No-show")}
                      title="No-show"
                      className={`grid h-9 w-8 flex-none place-items-center rounded-[9px] border hover:bg-row ${
                        status === "No-show" ? "border-bad bg-bad/10 text-bad" : "border-divider text-muted"
                      }`}
                    >
                      ✕
                    </button>
                    <Link
                      href={member ? `/members/${member.id}` : "/members"}
                      className="flex flex-1 min-w-0 items-center gap-2.5 rounded-[9px] border border-divider px-2.5 py-1.5 text-fg hover:bg-row"
                    >
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-row text-[10px] font-semibold text-muted">{initialsOf(n)}</span>
                      <span className={`min-w-0 flex-1 truncate text-[13.5px] ${status === "No-show" ? "line-through" : ""}`}>{n}</span>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mt-3.5 flex gap-1.5">
              <Select
                value={addPick}
                onChange={setAddPick}
                placeholder="Add a member…"
                options={members.filter(
                  (m) => !(selected!.roster ?? []).includes(m.name) && !(classAdds[selected!.key] ?? []).includes(m.name),
                ).map((m) => ({ value: m.name, label: m.name }))}
                className="h-9 min-w-0 flex-1 rounded-[9px] px-2 text-[13.5px]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!addPick) return;
                  const cap = capacityOf(selected!.type, selected!.name, selected!.capacity);
                  const head = (selected!.roster ?? []).length + (classAdds[selected!.key] ?? []).length;
                  const pick = addPick;
                  startTransition(async () => {
                    if (cap > 0 && head >= cap) await addToWaitlist(selected!.key, pick);
                    else await addToClass(selected!.key, pick);
                    scheduleData.refetch();
                  });
                  setAddPick("");
                }}
                className="h-9 flex-none rounded-[9px] bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
              >
                {(() => {
                  const cap = capacityOf(selected.type, selected.name, selected.capacity);
                  const head = (selected.roster ?? []).length + (classAdds[selected.key] ?? []).length;
                  return cap > 0 && head >= cap ? "Waitlist" : "Book in";
                })()}
              </button>
            </div>

            {(waitlists[selected.key] ?? []).length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs tracking-wider text-muted uppercase">Waitlist</div>
                <div className="flex flex-col gap-1">
                  {(waitlists[selected.key] ?? []).map((n, i) => (
                    <div key={n} className="flex min-w-0 items-center gap-2.5 rounded-[9px] border border-dashed border-divider px-2.5 py-1.5">
                      <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-row text-[10px] font-semibold text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{n}</span>
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await promoteFromWaitlist(selected!.key, n); scheduleData.refetch(); })}
                        className="h-[26px] flex-none rounded-full border border-divider px-2.5 text-xs hover:bg-row"
                      >
                        Book in
                      </button>
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await removeFromWaitlist(selected!.key, n); scheduleData.refetch(); })}
                        title="Remove from waitlist"
                        className="grid h-[26px] w-[26px] flex-none place-items-center rounded-md text-muted hover:bg-row hover:text-fg"
                      >
                        <XIcon size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto px-5 py-[22px]">
            <Link href="/schedule" className="grid h-10 place-items-center rounded-full border border-divider text-[13.5px] hover:bg-row">
              Open in the schedule
            </Link>
          </div>
        </div>
      )}

      {addClassOpen && (
        <BookingDialog
          iso={isoOf(startOfToday())}
          start={540}
          dateEditable
          getOccurrencesForIso={(dateIso) => occurrencesOn(scheduleData, dateIso)}
          defaultType="Class"
          onClose={() => setAddClassOpen(false)}
          onSaved={() => scheduleData.refetch()}
          members={members}
          coaches={coaches}
        />
      )}
    </div>
  );
}
