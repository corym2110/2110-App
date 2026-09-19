"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getCreditInfoForOccurrence, setOccurrenceCredit, type OccurrenceCreditInfo } from "@/server/billing";
import { Select } from "@/components/ui/Select";
import { money, formatDateShort } from "@/lib/time";

const UNPAID = "__unpaid__";

/** The "Paid with" dropdown on a session's detail panel — shows which pre-billed session credit
    covers this specific occurrence for this specific member, and lets staff switch it to a
    different unapplied credit (or back to Unpaid) right from the calendar, mirroring the
    reconciliation control that otherwise only lives in the member's "Session credits" dialog. */
export function PaidWithControl({
  occurrenceKey,
  memberId,
  memberName,
  coachId,
  coachName,
  sessionType,
}: {
  occurrenceKey: string;
  memberId: string;
  memberName: string;
  coachId: string;
  coachName: string;
  sessionType: string;
}) {
  const [info, setInfo] = useState<OccurrenceCreditInfo | null>(null);
  const [isPending, startTransition] = useTransition();

  function refetch() {
    getCreditInfoForOccurrence(occurrenceKey, memberId, sessionType, coachId).then(setInfo);
  }
  useEffect(refetch, [occurrenceKey, memberId, sessionType, coachId]);

  if (info === null) return null;

  const options = [
    { value: UNPAID, label: "Unpaid" },
    ...(info.applied ? [{ value: info.applied.id, label: `${sessionType} credit — ${money(info.applied.unitPrice)} (applied)` }] : []),
    ...info.availableCredits.map((c) => ({
      value: c.id,
      label: `${sessionType} credit — ${money(c.unitPrice)} (bought ${formatDateShort(new Date(c.createdAt))})`,
    })),
  ];

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs tracking-wider text-muted uppercase">Paid with</span>
        {!info.applied && info.availableCredits.length === 0 && (
          <Link
            href={`/pos?member=${encodeURIComponent(memberName)}&type=${encodeURIComponent(sessionType)}&coach=${encodeURIComponent(coachName)}`}
            className="text-[11.5px] text-link hover:text-link-hover"
          >
            Bill this client →
          </Link>
        )}
      </div>
      <Select
        value={info.applied?.id ?? UNPAID}
        onChange={(v) => {
          startTransition(async () => {
            await setOccurrenceCredit(occurrenceKey, memberId, v === UNPAID ? null : v);
            refetch();
          });
        }}
        options={options}
        className="h-9 w-full rounded-lg px-2.5 text-[13px]"
        disabled={isPending}
      />
      <div className={`mt-1 text-[11.5px] ${info.applied ? "text-ok" : "text-bad"}`}>{info.applied ? "Paid" : "Unpaid"}</div>
    </div>
  );
}
