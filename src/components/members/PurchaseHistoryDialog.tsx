"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSalesForMember, type MemberSaleHistoryRow } from "@/server/sales";
import { formatDateShort, money } from "@/lib/time";
import { XIcon } from "@/components/ui/icons";

export function PurchaseHistoryDialog({ memberId, memberName, onClose }: { memberId: string; memberName: string; onClose: () => void }) {
  const [sales, setSales] = useState<MemberSaleHistoryRow[] | null>(null);

  useEffect(() => {
    getSalesForMember(memberId).then(setSales);
  }, [memberId]);

  const lifetimeSpend = (sales ?? []).filter((s) => s.paid).reduce((a, s) => a + s.total, 0);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[85vh] w-full max-w-[560px] flex-col gap-3.5 overflow-hidden rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Purchase history</div>
            <div className="text-[13px] text-muted">Every sale on file for {memberName}.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        {sales && sales.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-row px-4 py-3">
            <span className="text-[13px] text-muted">Lifetime spend</span>
            <span className="text-[17px] font-semibold tabular-nums">{money(lifetimeSpend)}</span>
          </div>
        )}

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {sales === null && <div className="py-10 text-center text-[13.5px] text-muted">Loading…</div>}
          {sales?.length === 0 && <div className="py-10 text-center text-[13.5px] text-muted">No purchases on file yet.</div>}
          {sales?.map((s) => (
            <Link
              key={s.id}
              href={`/invoices/${s.id}`}
              className="flex items-center gap-3 border-b border-divider py-2.5 text-fg last:border-b-0 hover:bg-row"
            >
              <span className="w-[92px] flex-none text-[12.5px] tabular-nums text-muted">{formatDateShort(new Date(s.createdAt))}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{s.summary}</span>
              <span className="w-16 flex-none text-right text-[13px] tabular-nums font-medium">{money(s.total)}</span>
              <span className={`w-16 flex-none rounded-md py-0.5 text-center text-[11px] font-medium ${s.paid ? "bg-ok/15 text-ok" : "bg-bad/10 text-bad"}`}>
                {s.paid ? "Paid" : "Unpaid"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
