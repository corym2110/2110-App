"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember } from "@/server/members";
import { XIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";

const PLAN_OPTIONS = [
  "PT 10-pack",
  "PT 20-pack",
  "Group 8-pack",
  "Class membership",
  "Remote coaching",
  "Assessment only",
  "B&B pending",
];

export function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState(PLAN_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSave = name.trim().length > 0 && email.trim().length > 0;

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await addMember({ name, email, phone, plan });
        onClose();
        router.push(`/members/${id}`);
      } catch {
        setError("Couldn't add that member — check the email isn't already in use.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex w-full max-w-[420px] flex-col gap-3.5 rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-medium tracking-tight">Add member</div>
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
            placeholder="Full name"
            className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.com"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 403 555 0100"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Plan</span>
          <Select
            value={plan}
            onChange={setPlan}
            options={PLAN_OPTIONS.map((p) => ({ value: p, label: p }))}
            className="h-10 rounded-lg px-2.5 text-sm"
          />
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
            {isPending ? "Adding…" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}
