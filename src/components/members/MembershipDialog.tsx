"use client";

import { useState, useTransition } from "react";
import { setMembership, type MembershipInfo } from "@/server/members";
import { XIcon } from "@/components/ui/icons";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MembershipDialog({
  memberId,
  memberName,
  existing,
  hasCardOnFile,
  onClose,
  onSaved,
}: {
  memberId: string;
  memberName: string;
  existing: MembershipInfo | null | undefined;
  hasCardOnFile: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : "");
  const [nextBillDate, setNextBillDate] = useState(existing?.nextBillDate ?? todayIso());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const priceNumber = Number(price);
  const canSave = name.trim().length > 0 && priceNumber > 0 && nextBillDate.length > 0;

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await setMembership(memberId, { name: name.trim(), price: priceNumber, nextBillDate });
        onSaved();
        onClose();
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Couldn't save that membership.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex w-full max-w-[420px] flex-col gap-3.5 rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">{existing ? "Edit membership" : "Set up membership"}</div>
            <div className="text-[13px] text-muted">For {memberName} — charges the card on file automatically each month.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        {!hasCardOnFile && (
          <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">
            No card on file yet — billing will stay on hold until one&apos;s saved.
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Plan name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Membership – 3x/Week"
            className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Price / month</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="129.00"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">First charge</span>
            <input
              type="date"
              value={nextBillDate}
              onChange={(e) => setNextBillDate(e.target.value)}
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
        </div>

        {error && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{error}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || isPending}
            className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
