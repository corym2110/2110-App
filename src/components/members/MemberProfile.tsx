"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { XIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { useThemeStore } from "@/stores/theme";
import { useCoaches } from "@/lib/useCoaches";
import { useScheduleRange, occurrencesOn } from "@/lib/useSchedule";
import { cancelOccurrence } from "@/server/schedule";
import { addSharedAccount, removeSharedAccount, type SharedAccountLink } from "@/server/members";
import { getUnpaidSalesForMember, markSalePaid, type UnpaidSale } from "@/server/sales";
import { CreateInvoiceDialog } from "@/components/members/CreateInvoiceDialog";
import { PurchaseHistoryDialog } from "@/components/members/PurchaseHistoryDialog";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { SignWaiverDialog } from "@/components/members/SignWaiverDialog";
import { WaiverViewDialog } from "@/components/members/WaiverViewDialog";
import { getWaiverSignaturesForMember, type WaiverSummaryRow } from "@/server/waivers";
import { SessionCreditsDialog } from "@/components/members/SessionCreditsDialog";
import { getSessionCreditsForMember, type SessionCreditRow } from "@/server/billing";
import { PREBILL_TYPES } from "@/lib/prebill";
import { sessionTypeColor, shortLabel } from "@/data/mock/sessionTypes";
import { addDays, formatDateShort, initialsOf, isoOf, money, slotKey, startOfToday } from "@/lib/time";
import type { Member, SessionTypeName } from "@/types";

const HISTORY_LOOKBACK_DAYS = 90;
const UPCOMING_WINDOW_DAYS = 90;

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
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [addPick, setAddPick] = useState("");
  const [isPending, startTransition] = useTransition();
  const [unpaidSales, setUnpaidSales] = useState<UnpaidSale[]>([]);
  const [isPayingSale, startPaySale] = useTransition();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [signWaiverOpen, setSignWaiverOpen] = useState(false);
  const [viewingWaiverId, setViewingWaiverId] = useState<string | null>(null);
  const [waivers, setWaivers] = useState<WaiverSummaryRow[]>([]);
  const [credits, setCredits] = useState<SessionCreditRow[]>([]);
  const [creditsOpen, setCreditsOpen] = useState(false);

  const coaches = useCoaches();

  useEffect(() => {
    getUnpaidSalesForMember(member.id).then(setUnpaidSales);
  }, [member.id]);

  function refetchWaivers() {
    getWaiverSignaturesForMember(member.id).then(setWaivers);
  }
  useEffect(refetchWaivers, [member.id]);

  function refetchCredits() {
    getSessionCreditsForMember(member.id).then(setCredits);
  }
  useEffect(refetchCredits, [member.id]);
  const paidOccurrenceKeys = new Set(credits.map((c) => c.appliedOccurrenceKey).filter((k): k is string => !!k));

  const today = useMemo(() => startOfToday(), []);
  const fromIso = useMemo(() => isoOf(addDays(today, -HISTORY_LOOKBACK_DAYS)), [today]);
  const scheduleData = useScheduleRange(fromIso, isoOf(today));

  const history = useMemo(() => {
    const rows: { iso: string; start: number; type: SessionTypeName; coach: string; status: string | null }[] = [];
    for (let i = 0; i <= HISTORY_LOOKBACK_DAYS; i++) {
      const date = addDays(today, -i);
      const occs = occurrencesOn(scheduleData, isoOf(date));
      for (const o of occs) {
        if (o.name !== member.name && !(o.roster ?? []).includes(member.name)) continue;
        rows.push({
          iso: o.iso,
          start: o.start,
          type: o.type,
          coach: coaches.find((c) => c.id === o.coach)?.name ?? o.coach,
          status: scheduleData.attendance[slotKey(o.iso, o.start, o.coach, member.name)] ?? null,
        });
      }
    }
    return rows.sort((a, b) => (a.iso === b.iso ? b.start - a.start : b.iso < a.iso ? -1 : 1));
  }, [scheduleData, today, member.name, coaches]);

  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const upcomingToIso = useMemo(() => isoOf(addDays(today, UPCOMING_WINDOW_DAYS)), [today]);
  const upcomingData = useScheduleRange(isoOf(tomorrow), upcomingToIso);

  const upcoming = useMemo(() => {
    const rows: { iso: string; start: number; type: SessionTypeName; coach: string; key: string; sourceId: string }[] = [];
    for (let i = 0; i <= UPCOMING_WINDOW_DAYS; i++) {
      const date = addDays(tomorrow, i);
      const occs = occurrencesOn(upcomingData, isoOf(date));
      for (const o of occs) {
        if (o.name !== member.name && !(o.roster ?? []).includes(member.name)) continue;
        rows.push({ iso: o.iso, start: o.start, type: o.type, coach: coaches.find((c) => c.id === o.coach)?.name ?? o.coach, key: o.key, sourceId: o.sourceId });
      }
    }
    return rows.sort((a, b) => (a.iso === b.iso ? a.start - b.start : a.iso < b.iso ? -1 : 1));
  }, [upcomingData, tomorrow, member.name, coaches]);

  const [historyTab, setHistoryTab] = useState<"upcoming" | "completed">("upcoming");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [confirmCancel, setConfirmCancel] = useState<"selected" | "all" | null>(null);
  const [isCancelling, startCancelling] = useTransition();

  function toggleSelected(key: string) {
    setSelectedKeys((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function runCancel(rows: typeof upcoming) {
    startCancelling(async () => {
      for (const row of rows) {
        await cancelOccurrence(row.sourceId, row.key);
      }
      setSelectedKeys(new Set());
      setConfirmCancel(null);
      upcomingData.refetch();
    });
  }

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
            <span className="rounded-full bg-row px-2.5 py-1 text-[12.5px] text-muted" title="Sum of every paid sale, all-time">
              {money(member.lifetimeSpend)} lifetime
            </span>
          </div>
        </div>
        <div className="flex flex-none gap-2">
          <Link href="/schedule" className="grid h-[38px] place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Book session
          </Link>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="grid h-[38px] place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row"
          >
            Purchase history
          </button>
          <button
            type="button"
            onClick={() => setInvoiceOpen(true)}
            className="grid h-[38px] place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row"
          >
            Create invoice
          </button>
          <button
            type="button"
            onClick={() => setSignWaiverOpen(true)}
            className="grid h-[38px] place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row"
          >
            Sign waiver
          </button>
          <button
            type="button"
            onClick={() => setCreditsOpen(true)}
            className="grid h-[38px] place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row"
          >
            Session credits
          </button>
          <Link
            href={`/pos?member=${encodeURIComponent(member.name)}`}
            className="grid h-[38px] place-items-center rounded-full bg-accent px-[18px] text-[13.5px] font-semibold text-on-accent"
          >
            Charge account
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
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
          <div className="mb-3 flex items-baseline justify-between gap-2.5">
            <h5 className="text-[15.5px] font-semibold">Contact</h5>
            <button type="button" onClick={() => setEditOpen(true)} className="text-[12.5px] text-muted hover:text-fg">
              Edit
            </button>
          </div>
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
            {member.dateOfBirth && (
              <>
                <span className="text-muted">Birthday</span>
                <span>{formatDateShort(new Date(`${member.dateOfBirth}T00:00:00`))}</span>
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
            {member.emergencyContactName || member.emergencyContactPhone ? (
              <span className="min-w-0 text-pretty">{[member.emergencyContactName, member.emergencyContactPhone].filter(Boolean).join(" · ")}</span>
            ) : (
              <span className="text-bad">Not on file</span>
            )}
          </div>

          <div className="mt-3.5 border-t border-divider pt-3">
            <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Waivers</div>
            {waivers.length === 0 && <div className="text-[13px] text-bad">Not signed yet</div>}
            {waivers.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setViewingWaiverId(w.id)}
                className="-mx-1 flex w-[calc(100%+8px)] items-center justify-between gap-2.5 rounded-lg px-1 py-1 text-left text-[13.5px] hover:bg-row"
              >
                <span className="min-w-0 truncate text-ok">{w.waiverType}</span>
                <span className="flex-none text-[12px] text-muted">{formatDateShort(new Date(w.createdAt))}</span>
              </button>
            ))}
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
          {unpaidSales.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5 border-t border-divider pt-3">
              <div className="text-[11px] tracking-wider text-muted uppercase">Unpaid charges</div>
              {unpaidSales.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px]">{s.summary}</span>
                  <span className="flex-none text-[13px] tabular-nums text-bad">{money(s.total)}</span>
                  <Link href={`/invoices/${s.id}`} className="flex-none text-[11.5px] text-link hover:text-link-hover">
                    Invoice
                  </Link>
                  <button
                    type="button"
                    disabled={isPayingSale}
                    onClick={() =>
                      startPaySale(async () => {
                        await markSalePaid(s.id, member.id);
                        getUnpaidSalesForMember(member.id).then(setUnpaidSales);
                      })
                    }
                    className="h-7 flex-none rounded-md border border-divider px-2 text-[11.5px] hover:bg-row disabled:opacity-60"
                  >
                    Mark paid
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-3 text-[15.5px] font-semibold">Notes</h5>
          <div className="text-[13.5px] text-pretty text-muted">
            Right shoulder mobility work before overhead pressing. Prefers early sessions and texts to confirm the night before.
          </div>
        </Card>
      </div>

      <Card className="px-[22px] py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex gap-1 rounded-[11px] border border-divider p-1">
            {(["upcoming", "completed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setHistoryTab(t)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] capitalize ${historyTab === t ? "bg-row font-semibold text-fg" : "text-muted"}`}
              >
                {t} {t === "upcoming" ? `(${upcoming.length})` : ""}
              </button>
            ))}
          </div>
          <Link href="/schedule" className="text-[13px] text-link hover:text-link-hover">
            Open schedule
          </Link>
        </div>

        {historyTab === "upcoming" && (
          <>
            {upcoming.length > 0 && (
              <div className="mb-2.5 flex items-center justify-between gap-3.5">
                <span className="text-[12.5px] text-muted">{selectedKeys.size > 0 ? `${selectedKeys.size} selected` : "Select sessions to cancel them early"}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={selectedKeys.size === 0 || isCancelling}
                    onClick={() => setConfirmCancel("selected")}
                    className="h-8 rounded-full border border-divider px-3.5 text-[12.5px] hover:bg-row disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Cancel selected
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setConfirmCancel("all")}
                    className="h-8 rounded-full border border-bad/40 px-3.5 text-[12.5px] text-bad hover:bg-bad/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Cancel all upcoming
                  </button>
                </div>
              </div>
            )}

            {confirmCancel && (
              <div className="mb-2.5 rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">
                {confirmCancel === "all"
                  ? `Cancel all ${upcoming.length} upcoming session${upcoming.length === 1 ? "" : "s"} for ${member.name}? This can't be undone.`
                  : `Cancel ${selectedKeys.size} selected session${selectedKeys.size === 1 ? "" : "s"}? This can't be undone.`}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => runCancel(confirmCancel === "all" ? upcoming : upcoming.filter((u) => selectedKeys.has(u.key)))}
                    className="h-8 rounded-full bg-bad px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                  >
                    {isCancelling ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button type="button" onClick={() => setConfirmCancel(null)} className="h-8 rounded-full border border-divider px-3.5 text-[12.5px] hover:bg-row">
                    Never mind
                  </button>
                </div>
              </div>
            )}

            {upcoming.length === 0 && <div className="py-6 text-center text-[13.5px] text-muted">No upcoming sessions.</div>}
            {upcoming.map((h, i) => (
              <div key={`${h.key}-${i}`} className="flex items-center gap-3.5 border-b border-divider py-2.5 last:border-b-0">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(h.key)}
                  onChange={() => toggleSelected(h.key)}
                  className="h-4 w-4 flex-none"
                  aria-label={`Select ${h.type} on ${formatDateShort(new Date(`${h.iso}T00:00:00`))}`}
                />
                <span className="w-[112px] flex-none text-[13.5px] tabular-nums text-muted">{formatDateShort(new Date(`${h.iso}T00:00:00`))}</span>
                <span className="w-[66px] flex-none text-[13px] font-semibold" style={{ color: sessionTypeColor(h.type, dark) }}>
                  {shortLabel(h.type)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{h.type}</span>
                {(PREBILL_TYPES as readonly string[]).includes(h.type) && (
                  <span className={`w-[64px] flex-none text-right text-[11.5px] ${paidOccurrenceKeys.has(h.key) ? "text-ok" : "text-bad"}`}>
                    {paidOccurrenceKeys.has(h.key) ? "Paid" : "Unpaid"}
                  </span>
                )}
                <span className="w-[104px] flex-none text-right text-[12.5px] text-muted">{h.coach}</span>
              </div>
            ))}
          </>
        )}

        {historyTab === "completed" && (
          <>
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
                    {shortLabel(h.type)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{h.type}</span>
                  <span className="w-[104px] flex-none text-right text-[12.5px] text-muted">{h.coach}</span>
                  <span className={`w-24 flex-none rounded-md py-0.5 text-center text-[11.5px] ${badgeClass}`}>{label}</span>
                </div>
              );
            })}
          </>
        )}
      </Card>

      {invoiceOpen && <CreateInvoiceDialog member={member} onClose={() => setInvoiceOpen(false)} />}
      {historyOpen && <PurchaseHistoryDialog memberId={member.id} memberName={member.name} onClose={() => setHistoryOpen(false)} />}
      {signWaiverOpen && <SignWaiverDialog member={member} onClose={() => setSignWaiverOpen(false)} onSigned={refetchWaivers} />}
      {viewingWaiverId && <WaiverViewDialog waiverId={viewingWaiverId} onClose={() => setViewingWaiverId(null)} />}
      {editOpen && <AddMemberDialog existing={member} onClose={() => setEditOpen(false)} onSaved={() => router.refresh()} />}
      {creditsOpen && (
        <SessionCreditsDialog
          memberId={member.id}
          memberName={member.name}
          availableSlots={upcoming
            .filter((u) => (PREBILL_TYPES as readonly string[]).includes(u.type) && !paidOccurrenceKeys.has(u.key))
            .map((u) => ({ key: u.key, iso: u.iso, start: u.start, type: u.type }))}
          onClose={() => setCreditsOpen(false)}
          onChanged={refetchCredits}
        />
      )}
    </div>
  );
}
