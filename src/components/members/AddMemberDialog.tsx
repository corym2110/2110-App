"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember } from "@/server/members";
import { XIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";

const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];

export function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSave =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    gender.length > 0;

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await addMember({ firstName, lastName, email, phone, gender, address, postalCode, city, province });
        onClose();
        router.push(`/members/${id}`);
      } catch {
        setError("Couldn't add that member — check the email isn't already in use.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[90vh] w-full max-w-[440px] flex-col gap-3.5 overflow-y-auto rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-medium tracking-tight">Add member</div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">First name</span>
            <input
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Last name</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
        </div>

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
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Phone number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 403 555 0100"
              className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Gender</span>
          <Select
            value={gender}
            onChange={setGender}
            placeholder="Select…"
            options={GENDER_OPTIONS.map((g) => ({ value: g, label: g }))}
            className="h-10 rounded-lg px-2.5 text-sm"
          />
        </label>

        <div className="mt-1 border-t border-divider pt-3.5">
          <div className="mb-3 text-[11.5px] tracking-wider text-muted uppercase">Address (optional)</div>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Address</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">City</span>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Calgary"
                  className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Province</span>
                <input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="AB"
                  className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Postal code</span>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="T2H 1B4"
                className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
            </label>
          </div>
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
            {isPending ? "Adding…" : "Add member"}
          </button>
        </div>
      </div>
    </div>
  );
}
