"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Occurrence } from "@/server/schedule";
import { setAttendanceStatus, addToClass, addToWaitlist, removeFromWaitlist, promoteFromWaitlist } from "@/server/schedule";
import { capacityOf } from "@/data/mock/sessionTypes";
import { clock, formatDateLong, initialsOf, slotKey } from "@/lib/time";
import { XIcon, PencilIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { PaidWithControl } from "@/components/schedule/PaidWithControl";
import { PREBILL_TYPES } from "@/lib/prebill";
import type { CoachRow } from "@/server/coaches";
import type { AttendanceStatus, Member } from "@/types";

const STATUS_OPTIONS: AttendanceStatus[] = ["Checked in", "No-show", "Late cancel"];

export function DetailPanel({
  occurrence,
  members,
  coaches,
  attendance,
  waitlists,
  classAdds,
  onClose,
  onEdit,
  onDataChanged,
}: {
  occurrence: Occurrence;
  members: Member[];
  coaches: CoachRow[];
  attendance: Record<string, string>;
  waitlists: Record<string, string[]>;
  classAdds: Record<string, string[]>;
  onClose: () => void;
  onEdit: (occurrence: Occurrence) => void;
  onDataChanged: () => void;
}) {
  const [addPick, setAddPick] = useState("");
  const [, startTransition] = useTransition();

  function setStatus(key: string, status: AttendanceStatus | null) {
    startTransition(async () => {
      await setAttendanceStatus(key, occurrence.iso, status);
      onDataChanged();
    });
  }

  const isGroup = !!occurrence.roster?.length;
  const roster = [...(occurrence.roster ?? []), ...(classAdds[occurrence.key] ?? [])];
  const cap = capacityOf(occurrence.type, occurrence.name, occurrence.capacity);
  const head = isGroup ? roster.length : 0;
  const full = cap > 0 && head >= cap;
  const waiting = waitlists[occurrence.key] ?? [];
  const member = !isGroup ? members.find((m) => m.name === occurrence.name) : undefined;
  const coachDisplayName = coaches.find((c) => c.id === occurrence.coach)?.name ?? occurrence.coach;
  const soloKey = slotKey(occurrence.iso, occurrence.start, occurrence.coach, occurrence.name);
  const soloStatus = attendance[soloKey] as AttendanceStatus | undefined;

  return (
    <div className="panel-shadow fixed bottom-0 right-0 top-16 z-50 flex w-[352px] max-w-full flex-col overflow-y-auto border-l border-divider bg-surface">
      <div className="flex items-start gap-3 px-5 pt-[18px]">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-medium tracking-tight">{occurrence.name || "Group Training"}</div>
          <div className="mt-0.5 text-[13px] text-muted">
            {formatDateLong(new Date(`${occurrence.iso}T00:00:00`))} · {clock(occurrence.start)} – {clock(occurrence.start + occurrence.duration)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEdit(occurrence)}
          title="Edit session"
          className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg"
        >
          <PencilIcon size={15} />
        </button>
        <button type="button" onClick={onClose} title="Close" className="grid h-[30px] w-[30px] flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
          <XIcon size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2.5 px-5 pt-3 text-[13.5px] text-muted">
        <span className="text-fg">{coachDisplayName}</span>
        <span>·</span>
        <span>{occurrence.type}</span>
      </div>

      {!isGroup && (
        <div className="px-5 pt-4">
          <div className="mb-2 text-xs tracking-wider text-muted uppercase">Client</div>
          {member ? (
            <Link href={`/members/${member.id}`} className="flex items-center gap-2.5 rounded-lg border border-divider px-3 py-2.5 text-fg hover:bg-row">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-row text-[11px] font-semibold text-muted">{initialsOf(member.name)}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{member.name}</span>
              <span className="flex-none text-xs text-link">View profile →</span>
            </Link>
          ) : (
            <div className="text-[13.5px] text-muted">{occurrence.name}</div>
          )}
          <div className="mt-3">
            <div className="flex gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(soloKey, soloStatus === s ? null : s)}
                  className={`h-8 flex-1 rounded-lg border text-xs ${
                    soloStatus === s ? "border-accent bg-row font-semibold text-fg" : "border-divider text-muted"
                  }`}
                >
                  {s === "Checked in" ? "Check in" : s}
                </button>
              ))}
            </div>
          </div>
          {member && (PREBILL_TYPES as readonly string[]).includes(occurrence.type) && (
            <PaidWithControl
              occurrenceKey={occurrence.key}
              memberId={member.id}
              memberName={member.name}
              coachId={occurrence.coach}
              coachName={coachDisplayName}
              sessionType={occurrence.type}
            />
          )}
          {member && (
            <Link
              href={`/pos?member=${encodeURIComponent(member.name)}&type=${encodeURIComponent(occurrence.type)}&coach=${encodeURIComponent(coachDisplayName)}`}
              className="mt-3 flex h-10 items-center justify-center rounded-full border border-divider text-[13.5px] hover:bg-row"
            >
              Go to store
            </Link>
          )}
        </div>
      )}

      {isGroup && (
        <div className="px-5 pt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2.5">
            <span className="text-xs tracking-wider text-muted uppercase">Roster</span>
            <span className="text-xs text-muted">
              {head} {occurrence.type === "Class" ? "signed in" : "booked"}
            </span>
          </div>
          {cap > 0 && (
            <div className="mb-3">
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span>
                  {head} of {cap}
                </span>
                <span className={full ? "text-bad" : "text-muted"}>{full ? "Full" : `${cap - head} left`}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-row">
                <div className={`h-full ${full ? "bg-bad" : "bg-accent"}`} style={{ width: `${Math.min(100, Math.round((head / cap) * 100))}%` }} />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {roster.map((n) => {
              const key = slotKey(occurrence.iso, occurrence.start, occurrence.coach, n);
              const status = attendance[key];
              const m = members.find((mm) => mm.name === n);
              return (
                <div key={n} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatus(key, status === "Checked in" ? null : "Checked in")}
                    title="Check in"
                    className={`grid h-9 w-8 flex-none place-items-center rounded-[9px] border hover:bg-row ${
                      status === "Checked in" ? "border-ok bg-ok/15 text-ok" : "border-divider text-muted"
                    }`}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(key, status === "No-show" ? null : "No-show")}
                    title="No-show"
                    className={`grid h-9 w-8 flex-none place-items-center rounded-[9px] border hover:bg-row ${
                      status === "No-show" ? "border-bad bg-bad/10 text-bad" : "border-divider text-muted"
                    }`}
                  >
                    ✕
                  </button>
                  <Link href={m ? `/members/${m.id}` : "/members"} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[9px] border border-divider px-2.5 py-1.5 text-fg hover:bg-row">
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
              options={members.filter((m) => !roster.includes(m.name)).map((m) => ({ value: m.name, label: m.name }))}
              className="h-9 min-w-0 flex-1 rounded-[9px] px-2 text-[13.5px]"
            />
            <button
              type="button"
              onClick={() => {
                if (!addPick) return;
                const pick = addPick;
                startTransition(async () => {
                  if (full) await addToWaitlist(occurrence.key, pick);
                  else await addToClass(occurrence.key, pick);
                  onDataChanged();
                });
                setAddPick("");
              }}
              className="h-9 flex-none rounded-[9px] bg-accent px-3.5 text-[13px] font-semibold text-on-accent"
            >
              {full ? "Waitlist" : "Book in"}
            </button>
          </div>

          {waiting.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs tracking-wider text-muted uppercase">Waitlist</div>
              <div className="flex flex-col gap-1">
                {waiting.map((n, i) => (
                  <div key={n} className="flex min-w-0 items-center gap-2.5 rounded-[9px] border border-dashed border-divider px-2.5 py-1.5">
                    <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-row text-[10px] font-semibold text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{n}</span>
                    <button
                      type="button"
                      onClick={() => startTransition(async () => { await promoteFromWaitlist(occurrence.key, n); onDataChanged(); })}
                      className="h-[26px] flex-none rounded-full border border-divider px-2.5 text-xs hover:bg-row"
                    >
                      Book in
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(async () => { await removeFromWaitlist(occurrence.key, n); onDataChanged(); })}
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
      )}
    </div>
  );
}
