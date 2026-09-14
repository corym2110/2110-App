"use client";

import { useState, useTransition } from "react";
import { addSessionType } from "@/server/sessionTypes";
import { XIcon } from "@/components/ui/icons";

export function AddSessionTypeDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [capacity, setCapacity] = useState("0");
  const [price, setPrice] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSave = name.trim().length > 0 && Number(duration) > 0;

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await addSessionType({
          name,
          duration: Number(duration) || 60,
          capacity: Number(capacity) || 0,
          price: Number(price) || 0,
          recurring,
        });
        onAdded();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that session type.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex w-full max-w-[420px] flex-col gap-3.5 rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Add session type</div>
            <div className="text-[13px] text-muted">Makes this bookable from the Schedule right away.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Recovery Session"
            className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Length (min)</span>
            <input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Price</span>
            <input
              type="number"
              min={0}
              step={5}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm tabular-nums"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Capacity</span>
          <input
            type="number"
            min={0}
            step={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="0 = 1:1 session"
            className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm tabular-nums"
          />
        </label>

        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4" />
          Can be booked as a recurring series
        </label>

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
            {isPending ? "Adding…" : "Add session type"}
          </button>
        </div>
      </div>
    </div>
  );
}
