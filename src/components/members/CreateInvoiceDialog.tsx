"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/server/sales";
import { useCoaches } from "@/lib/useCoaches";
import { XIcon, PlusIcon } from "@/components/ui/icons";
import type { Member } from "@/types";

interface Row {
  description: string;
  amount: string;
}

export function CreateInvoiceDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const router = useRouter();
  const coaches = useCoaches();
  const [rows, setRows] = useState<Row[]>([{ description: "", amount: "" }]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = rows.map((r) => ({ description: r.description.trim(), amount: Math.max(0, Number(r.amount) || 0) })).filter((r) => r.description);
  const total = parsed.reduce((a, r) => a + r.amount, 0);
  const canSave = parsed.length > 0 && total > 0;

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { description: "", amount: "" }]);
  }
  function removeRow(i: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));
  }

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    const coachId = coaches.find((c) => c.name === member.coach)?.id;
    const summary = parsed.map((r) => r.description).join(", ");

    startTransition(async () => {
      try {
        const id = await createSale({
          memberId: member.id,
          coachId,
          summary,
          total,
          method: "Invoice",
          paid: false,
          notes: notes.trim() || undefined,
          lineItems: parsed,
        });
        onClose();
        router.push(`/invoices/${id}`);
      } catch {
        setError("Couldn't create that invoice. Try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[90vh] w-full max-w-[480px] flex-col gap-3.5 overflow-y-auto rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Create invoice</div>
            <div className="text-[13px] text-muted">Bills {member.name} now, due later — adds to their balance.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Line items</span>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={r.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                placeholder="e.g. PT session Sep 3"
                className="h-10 min-w-0 flex-1 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
              <div className="flex h-10 w-28 flex-none items-center rounded-lg border border-divider px-2.5 text-sm">
                <span className="mr-1 text-muted">$</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={r.amount}
                  onChange={(e) => updateRow(i, { amount: e.target.value })}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                title="Remove line"
                className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-bad disabled:opacity-30"
              >
                <XIcon size={13} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addRow} className="flex h-8 w-fit items-center gap-1.5 rounded-full border border-divider px-3 text-[12.5px] hover:bg-row">
            <PlusIcon size={12} />
            Add line
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">What this bills for</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. PT sessions Sep 1–15, three make-up sessions from August…"
            rows={3}
            className="rounded-lg border border-divider bg-transparent px-2.5 py-2 text-sm"
          />
        </label>

        <div className="flex items-center justify-between border-t border-divider pt-3">
          <span className="text-[13px] text-muted">Total due</span>
          <span className="text-[17px] font-semibold tabular-nums">${total.toFixed(2)}</span>
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
            {isPending ? "Creating…" : "Create invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
