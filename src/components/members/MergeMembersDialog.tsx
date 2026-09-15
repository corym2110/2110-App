"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mergeMembers } from "@/server/members";
import { useCoaches } from "@/lib/useCoaches";
import { XIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import type { Member } from "@/types";

type FieldKey = "name" | "email" | "phone" | "gender" | "address" | "plan" | "since" | "coach";

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "gender", label: "Gender" },
  { key: "address", label: "Address" },
  { key: "plan", label: "Plan" },
  { key: "since", label: "Member since" },
  { key: "coach", label: "Coach" },
];

function fieldValue(m: Member, key: FieldKey): string {
  switch (key) {
    case "name":
      return m.name;
    case "email":
      return m.email;
    case "phone":
      return m.phone;
    case "gender":
      return m.gender || "—";
    case "address":
      return [m.address, m.city, m.province, m.postalCode].filter(Boolean).join(", ") || "—";
    case "plan":
      return m.plan;
    case "since":
      return m.since;
    case "coach":
      return m.coach;
  }
}

export function MergeMembersDialog({ members, onClose }: { members: Member[]; onClose: () => void }) {
  const router = useRouter();
  const coaches = useCoaches();
  const [keepId, setKeepId] = useState("");
  const [removeId, setRemoveId] = useState("");
  const [picks, setPicks] = useState<Record<FieldKey, "keep" | "remove">>({
    name: "keep",
    email: "keep",
    phone: "keep",
    gender: "keep",
    address: "keep",
    plan: "keep",
    since: "keep",
    coach: "keep",
  });
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const keep = members.find((m) => m.id === keepId);
  const remove = members.find((m) => m.id === removeId);
  const bothPicked = !!keep && !!remove && keep.id !== remove.id;

  const memberOptions = useMemo(() => members.map((m) => ({ value: m.id, label: `${m.name} · ${m.email}` })), [members]);

  function save() {
    if (!keep || !remove || isPending) return;
    setError(null);
    const source = (k: FieldKey) => (picks[k] === "keep" ? keep : remove);
    const [firstName, ...rest] = source("name").name.split(" ");
    const coachName = source("coach").coach;
    const coachId = coaches.find((c) => c.name === coachName)?.id;
    const addrSource = source("address");

    startTransition(async () => {
      try {
        await mergeMembers({
          keepId: keep.id,
          removeId: remove.id,
          fields: {
            firstName,
            lastName: rest.join(" ") || "-",
            email: source("email").email,
            phone: source("phone").phone,
            gender: source("gender").gender || "",
            address: addrSource.address,
            postalCode: addrSource.postalCode,
            city: addrSource.city,
            province: addrSource.province,
            plan: source("plan").plan,
            since: source("since").since,
            coachId,
          },
        });
        onClose();
        router.push(`/members/${keep.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Couldn't merge those members.");
        setConfirming(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[90vh] w-full max-w-[560px] flex-col gap-3.5 overflow-y-auto rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Merge duplicate members</div>
            <div className="text-[13px] text-muted">Combines two profiles into one. This can&apos;t be undone.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Keep this profile</span>
            <Select
              value={keepId}
              onChange={(v) => setKeepId(v)}
              placeholder="Choose a member…"
              options={memberOptions.filter((o) => o.value !== removeId)}
              className="h-10 rounded-lg px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Merge in &amp; delete</span>
            <Select
              value={removeId}
              onChange={(v) => setRemoveId(v)}
              placeholder="Choose the duplicate…"
              options={memberOptions.filter((o) => o.value !== keepId)}
              className="h-10 rounded-lg px-2.5 text-sm"
            />
          </label>
        </div>

        {bothPicked && keep && remove && (
          <div className="flex flex-col gap-1 rounded-xl border border-divider p-1">
            <div className="grid grid-cols-[92px_1fr_1fr] gap-1.5 px-2.5 py-1.5 text-[10.5px] tracking-wider text-muted uppercase">
              <span />
              <span className="truncate">{keep.name}</span>
              <span className="truncate">{remove.name}</span>
            </div>
            {FIELDS.map((f) => (
              <div key={f.key} className="grid grid-cols-[92px_1fr_1fr] items-center gap-1.5 px-1.5 py-0.5">
                <span className="px-1 text-[12px] text-muted">{f.label}</span>
                <button
                  type="button"
                  onClick={() => setPicks((p) => ({ ...p, [f.key]: "keep" }))}
                  className={`min-w-0 truncate rounded-lg border px-2.5 py-2 text-left text-[12.5px] ${
                    picks[f.key] === "keep" ? "border-accent bg-row font-medium text-fg" : "border-divider text-muted hover:bg-row"
                  }`}
                >
                  {fieldValue(keep, f.key)}
                </button>
                <button
                  type="button"
                  onClick={() => setPicks((p) => ({ ...p, [f.key]: "remove" }))}
                  className={`min-w-0 truncate rounded-lg border px-2.5 py-2 text-left text-[12.5px] ${
                    picks[f.key] === "remove" ? "border-accent bg-row font-medium text-fg" : "border-divider text-muted hover:bg-row"
                  }`}
                >
                  {fieldValue(remove, f.key)}
                </button>
              </div>
            ))}
            <div className="px-2.5 pb-1 pt-2 text-pretty text-[12px] text-muted">
              Sales, balance, and shared-account links from both profiles move to the kept one. Past and upcoming sessions booked
              under either name get re-attributed to the merged member.
            </div>
          </div>
        )}

        {error && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{error}</div>}

        {confirming && (
          <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">
            Merge {remove?.name} into {keep?.name} and delete {remove?.name}&apos;s profile? This can&apos;t be undone.
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={save}
                className="h-8 rounded-full bg-bad px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
              >
                {isPending ? "Merging…" : "Yes, merge them"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="h-8 rounded-full border border-divider px-3.5 text-[12.5px] hover:bg-row">
                Never mind
              </button>
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!bothPicked || isPending || confirming}
            className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
          >
            Review merge
          </button>
        </div>
      </div>
    </div>
  );
}
