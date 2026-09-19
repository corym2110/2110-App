"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getSessionCreditsForMember, unapplyCredit, applyCreditToOccurrence, type SessionCreditRow } from "@/server/billing";
import { useCoaches } from "@/lib/useCoaches";
import { formatDateShort, clock, money } from "@/lib/time";
import { XIcon } from "@/components/ui/icons";

export function SessionCreditsDialog({
  memberId,
  memberName,
  availableSlots,
  onClose,
  onChanged,
}: {
  memberId: string;
  memberName: string;
  availableSlots: { key: string; iso: string; start: number; type: string; coachId: string }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const coaches = useCoaches();
  const [credits, setCredits] = useState<SessionCreditRow[] | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function refetch() {
    getSessionCreditsForMember(memberId).then(setCredits);
  }
  useEffect(refetch, [memberId]);

  function doUnapply(id: string) {
    setError(null);
    startTransition(async () => {
      await unapplyCredit(id);
      refetch();
      onChanged();
    });
  }

  function doApply(id: string, occurrenceKey: string) {
    setError(null);
    startTransition(async () => {
      try {
        await applyCreditToOccurrence(id, occurrenceKey);
        setApplyingId(null);
        refetch();
        onChanged();
      } catch {
        setError("That session is already covered by a different credit.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[85vh] w-full max-w-[560px] flex-col gap-3.5 overflow-hidden rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Session credits</div>
            <div className="text-[13px] text-muted">Every pre-billed session on file for {memberName}.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        {error && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{error}</div>}

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {credits === null && <div className="py-10 text-center text-[13.5px] text-muted">Loading…</div>}
          {credits?.length === 0 && <div className="py-10 text-center text-[13.5px] text-muted">No pre-billed sessions on file yet.</div>}

          {credits?.map((c) => (
            <div key={c.id} className="border-b border-divider py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[13.5px] font-medium">{c.sessionType}</span>
                  <span className="ml-2 text-[12.5px] text-muted">
                    {money(c.unitPrice)}
                    {c.coachId && ` · ${coaches.find((co) => co.id === c.coachId)?.name ?? "coach"}`}
                  </span>
                </div>
                <Link href={`/invoices/${c.saleId}`} className="text-[12px] text-link hover:text-link-hover">
                  View invoice
                </Link>
              </div>

              <div className="mt-1 flex items-center justify-between gap-3">
                {c.appliedIso ? (
                  <span className="text-[13px] text-ok">
                    Applied to {formatDateShort(new Date(`${c.appliedIso}T00:00:00`))}
                    {c.appliedStart != null && ` ${clock(c.appliedStart)}`}
                  </span>
                ) : (
                  <span className="text-[13px] text-bad">Unapplied — available</span>
                )}
                <div className="flex gap-2">
                  {c.appliedOccurrenceKey && (
                    <button type="button" disabled={isPending} onClick={() => doUnapply(c.id)} className="text-[12.5px] text-muted hover:text-fg">
                      Un-apply
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setApplyingId(applyingId === c.id ? null : c.id)}
                    className="text-[12.5px] text-link hover:text-link-hover"
                  >
                    Apply to…
                  </button>
                </div>
              </div>

              {applyingId === c.id && (
                <div className="mt-2 flex flex-col gap-1 rounded-lg border border-divider p-2">
                  {availableSlots.filter((s) => s.type === c.sessionType && (!c.coachId || s.coachId === c.coachId)).length === 0 && (
                    <div className="px-1.5 py-1 text-[12.5px] text-muted">
                      No upcoming {c.sessionType} sessions {c.coachId ? "with this coach " : ""}to apply this to.
                    </div>
                  )}
                  {availableSlots
                    .filter((s) => s.type === c.sessionType && (!c.coachId || s.coachId === c.coachId))
                    .map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        disabled={isPending}
                        onClick={() => doApply(c.id, s.key)}
                        className="flex items-center justify-between rounded-md px-1.5 py-1 text-left text-[12.5px] hover:bg-row"
                      >
                        <span>
                          {formatDateShort(new Date(`${s.iso}T00:00:00`))} {clock(s.start)}
                        </span>
                        <span className="text-muted">Choose</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
