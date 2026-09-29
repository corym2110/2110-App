"use client";

import { useState, useTransition } from "react";
import { logBodPodResult } from "@/server/bodpod";
import { XIcon } from "@/components/ui/icons";
import { isoOf, startOfToday } from "@/lib/time";
import type { Member } from "@/types";

function NumberField({
  label,
  unit,
  value,
  onChange,
  optional,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11.5px] tracking-wider text-muted uppercase">
        {label} {optional && <span className="normal-case">(optional)</span>}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-divider bg-transparent px-2.5 text-sm"
        />
        <span className="flex-none text-[12.5px] text-muted">{unit}</span>
      </div>
    </label>
  );
}

export function LogBodPodScanDialog({ member, onClose, onLogged }: { member: Member; onClose: () => void; onLogged: () => void }) {
  const [scanIso, setScanIso] = useState(isoOf(startOfToday()));
  const [bodyMassLbs, setBodyMassLbs] = useState("");
  const [fatMassLbs, setFatMassLbs] = useState("");
  const [fatFreeMassLbs, setFatFreeMassLbs] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [rmrKcal, setRmrKcal] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSave = !!scanIso && Number(bodyMassLbs) > 0 && Number(fatMassLbs) > 0 && Number(fatFreeMassLbs) > 0 && Number(bodyFatPct) > 0 && Number(bodyFatPct) <= 100;

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await logBodPodResult({
        memberId: member.id,
        scanIso,
        bodyMassLbs: Number(bodyMassLbs),
        fatMassLbs: Number(fatMassLbs),
        fatFreeMassLbs: Number(fatFreeMassLbs),
        bodyFatPct: Number(bodyFatPct),
        rmrKcal: rmrKcal ? Number(rmrKcal) : undefined,
        notes: notes.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onLogged();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[90vh] w-full max-w-[480px] flex-col gap-3.5 overflow-hidden rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Log BodPod scan</div>
            <div className="text-[13px] text-muted">For {member.name}, from the printed report.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <div className="-mx-1 flex flex-col gap-3 overflow-y-auto px-1">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Scan date</span>
            <input
              type="date"
              value={scanIso}
              onChange={(e) => setScanIso(e.target.value)}
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Body mass" unit="lb" value={bodyMassLbs} onChange={setBodyMassLbs} />
            <NumberField label="% Fat" unit="%" value={bodyFatPct} onChange={setBodyFatPct} />
            <NumberField label="Fat mass" unit="lb" value={fatMassLbs} onChange={setFatMassLbs} />
            <NumberField label="Fat free mass" unit="lb" value={fatFreeMassLbs} onChange={setFatFreeMassLbs} />
          </div>

          <NumberField label="RMR" unit="kcal/day" value={rmrKcal} onChange={setRmrKcal} optional />

          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-lg border border-divider bg-transparent px-2.5 py-2 text-sm"
            />
          </label>
        </div>

        {error && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || isPending}
            className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save scan"}
          </button>
        </div>
      </div>
    </div>
  );
}
