"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { XIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { useThemeStore } from "@/stores/theme";
import { useBookingsStore } from "@/stores/bookings";
import { useAttendanceStore, slotKey } from "@/stores/attendance";
import { occurrencesForDate } from "@/lib/scheduleEngine";
import { coachName } from "@/data/mock/coaches";
import { addSharedAccount, removeSharedAccount, type SharedAccountLink } from "@/server/members";
import { sessionTypeColor, SHORT_LABEL } from "@/data/mock/sessionTypes";
import { addDays, formatDateShort, initialsOf, money, startOfToday } from "@/lib/time";
import type { Member, SessionTypeName } from "@/types";

const HISTORY_LOOKBACK_DAYS = 90;

export function MemberProfile({
  member,
  paysFor,
  paidBy,
  candidates,
}: {
  member: Member;
  paysFor: SharedAccountLink[];
  paidBy: SharedAccountLink[];
  candidates: { id: string; name: string }[];
}) {
  const dark = useThemeStore((s) => s.theme === "dark");
  const [addOpen, setAddOpen] = useState(false);
  const [addPick, setAddPick] = useState("");
  const [isPending, startTransition] = useTransition();

  const { bookings, series, moves, cancellations } = useBookingsStore();
  const statuses = useAttendanceStore((s) => s.statuses);

  const history = useMemo(() => {
    const today = startOfToday();
    const rows: { iso: string; start: number; type: SessionTypeName; coach: string; status: string | null }[] = [];
    for (let i = 0; i < HISTORY_LOOKBACK_DAYS; i++) {
      const date = addDays(today, -i);
      const occs = occurrencesForDate(date, moves, bookings, series, cancellations);
      for (const o of occs) {
        if (o.name !== member.name && !(o.roster ?? []).includes(member.name)) continue;
        rows.push({
          iso: o.iso,
          start: o.start,
          type: o.type,
          coach: coachName(o.coach),
          status: statuses[slotKey(o.iso, o.start, o.coach, member.name)] ?? null,
        });
      }
    }
    return rows.sort((a, b) => (a.iso === b.iso ? b.start - a.start : b.iso < a.iso ? -1 : 1));
  }, [bookings, series, moves, cancellations, statuses, member.name]);

  return (
    <div className="flex flex-col gap-[18px]">
      <Link href="/members" className="flex items-center gap-1.5 text-[13.5px] text-muted hover:text-fg">
        ← All members
      </Link>

      <Card className="flex flex-wrap items-start gap-[18px] px-6 py-[22px]">
        <div className="grid h-16 w-16 flex-none place-items-center rounded-full bg-accent-deep text-[21px] font-semibold text-[#e7e5fe]">
          {initialsOf(member.name)}
        </div>
        <div className="min-w-[220px] flex-1">
          <h2 className="m-0 text-[27px] font-medium tracking-tight">{member.name}</h2>
          <div className="mt-0.5 text-[13.5px] text-muted">
            Member since {member.since} · Coach {member.coach}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-row px-2.5 py-1 text-[12.5px] font-medium">{member.plan}</span>
            <span className="rounded-full bg-row px-2.5 py-1 text-[12.5px] text-muted">
              {member.plan.includes("pack") ? "7 sessions left" : "Unlimited"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium ${
                member.balance > 0 ? "bg-bad/10 text-bad" : "bg-row text-muted"
              }`}
            >
              {member.balance > 0 ? `${money(member.balance)} due` : "$0.00"}
            </span>
          </div>
        </div>
        <div className="flex flex-none gap-2">
          <Link href="/schedule" className="grid h-[38px] place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Book session
          </Link>
          <Link
            href={`/pos?member=${encodeURIComponent(member.name)}`}
            className="grid h-[38px] place-items-center rounded-full bg-accent px-[18px] text-[13.5px] font-semibold text-on-accent"
          >
            Charge account
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-[18px]">
        <Card className="px-[22px] py-5">
          <div className="mb-3 flex items-baseline justify-between gap-2.5">
            <h5 className="text-[15.5px] font-semibold">Shared accounts</h5>
            <button type="button" onClick={() => setAddOpen((o) => !o)} className="text-[12.5px] text-muted hover:text-fg">
              {addOpen ? "Cancel" : "Add"}
            </button>
          </div>
          {addOpen && (
            <div className="mb-3.5 flex gap-1.5">
              <Select
                value={addPick}
                onChange={setAddPick}
                placeholder="Choose a member…"
                options={candidates.filter((c) => !paysFor.some((p) => p.id === c.id)).map((c) => ({ value: c.id, label: c.name }))}
                className="h-[34px] min-w-0 flex-1 rounded-lg px-2.5 text-[13px]"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!addPick) return;
                  const pick = addPick;
                  startTransition(async () => {
                    await addSharedAccount(member.id, pick);
                  });
                  setAddOpen(false);
                  setAddPick("");
                }}
                className="h-[34px] flex-none rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-on-accent disabled:opacity-60"
              >
                Link
              </button>
            </div>
          )}
          {paysFor.length > 0 && (
            <>
              <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Can purchase for</div>
              <div className="mb-3.5 flex flex-col gap-1">
                {paysFor.map((p) => (
                  <div key={p.id} className="-mx-2 flex items-center gap-1">
                    <Link
                      href={`/members/${p.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] text-fg hover:bg-row"
                    >
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-row text-[10px] font-semibold text-muted">
                        {initialsOf(p.name)}
                      </span>
                      <span className="min-w-0 truncate">{p.name}</span>
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await removeSharedAccount(member.id, p.id); })}
                      title="Remove link"
                      className="grid h-[26px] w-[26px] flex-none place-items-center rounded-md text-muted hover:bg-row hover:text-fg"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {paidBy.length > 0 && (
            <>
              <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Sessions paid by</div>
              <div className="flex flex-col gap-1">
                {paidBy.map((p) => (
                  <Link
                    key={p.id}
                    href={`/members/${p.id}`}
                    className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] text-fg hover:bg-row"
                  >
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-row text-[10px] font-semibold text-muted">
                      {initialsOf(p.name)}
                    </span>
                    <span className="min-w-0 truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {paysFor.length === 0 && paidBy.length === 0 && (
            <div className="text-[13px] text-pretty text-muted">No linked accounts. Add one to let someone else pay for this member&apos;s sessions.</div>
          )}
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-3 text-[15.5px] font-semibold">Contact</h5>
          <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13.5px]">
            <span className="text-muted">Phone</span>
            <span className="tabular-nums">{member.phone}</span>
            <span className="text-muted">Email</span>
            <span className="min-w-0 truncate">{member.email}</span>
            {member.gender && (
              <>
                <span className="text-muted">Gender</span>
                <span>{member.gender}</span>
              </>
            )}
            {(member.address || member.city || member.province || member.postalCode) && (
              <>
                <span className="text-muted">Address</span>
                <span className="min-w-0 text-pretty">
                  {[member.address, member.city, member.province, member.postalCode].filter(Boolean).join(", ")}
                </span>
              </>
            )}
            <span className="text-muted">Emergency</span>
            <span>On file</span>
            <span className="text-muted">Waiver</span>
            <span className="text-ok">Signed</span>
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-3 text-[15.5px] font-semibold">Membership</h5>
          <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13.5px]">
            <span className="text-muted">Plan</span>
            <span>{member.plan}</span>
            <span className="text-muted">Renews</span>
            <span>{member.plan.includes("membership") ? "Oct 1, 2026" : "On package completion"}</span>
            <span className="text-muted">Sessions left</span>
            <span>{member.plan.includes("pack") ? "7 sessions left" : "Unlimited"}</span>
            <span className="text-muted">Attendance</span>
            <span>92% last 90 days</span>
            <span className="text-muted">Balance</span>
            <span className={member.balance > 0 ? "text-bad" : "text-muted"}>{member.balance > 0 ? `${money(member.balance)} due` : "$0.00"}</span>
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-3 text-[15.5px] font-semibold">Notes</h5>
          <div className="text-[13.5px] text-pretty text-muted">
            Right shoulder mobility work before overhead pressing. Prefers early sessions and texts to confirm the night before.
          </div>
        </Card>
      </div>

      <Card className="px-[22px] py-5">
        <div className="mb-1.5 flex items-center justify-between gap-3.5">
          <h5 className="text-[15.5px] font-semibold">Session history</h5>
          <Link href="/schedule" className="text-[13px] text-link hover:text-link-hover">
            Open schedule
          </Link>
        </div>
        {history.length === 0 && (
          <div className="py-6 text-center text-[13.5px] text-muted">No sessions yet.</div>
        )}
        {history.map((h, i) => {
          const label = h.status ?? "Completed";
          const badgeClass =
            h.status === "No-show" || h.status === "Late cancel" || h.status === "Cancelled"
              ? "bg-bad/10 text-bad"
              : "bg-ok/15 text-ok";
          return (
            <div key={`${h.iso}-${h.start}-${i}`} className="flex items-center gap-4 border-b border-divider py-2.5 last:border-b-0">
              <span className="w-[112px] flex-none text-[13.5px] tabular-nums text-muted">{formatDateShort(new Date(`${h.iso}T00:00:00`))}</span>
              <span className="w-[66px] flex-none text-[13px] font-semibold" style={{ color: sessionTypeColor(h.type, dark) }}>
                {SHORT_LABEL[h.type]}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{h.type}</span>
              <span className="w-[104px] flex-none text-right text-[12.5px] text-muted">{h.coach}</span>
              <span className={`w-24 flex-none rounded-md py-0.5 text-center text-[11.5px] ${badgeClass}`}>{label}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
