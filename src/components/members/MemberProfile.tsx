"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { XIcon } from "@/components/ui/icons";
import { useThemeStore } from "@/stores/theme";
import { addSharedAccount, removeSharedAccount } from "@/server/members";
import { sessionTypeColor, SHORT_LABEL } from "@/data/mock/sessionTypes";
import { initialsOf, money } from "@/lib/time";
import type { Member, SessionTypeName } from "@/types";

function primaryTypeOf(plan: string): SessionTypeName {
  if (plan.startsWith("PT")) return "Personal Training";
  if (plan.startsWith("Group")) return "Group Training";
  if (plan.startsWith("Remote")) return "Remote Consult";
  if (plan.startsWith("Class")) return "Class";
  if (plan.startsWith("Assessment")) return "Bodpod";
  return "Blueprint and Baseline";
}

export function MemberProfile({
  member,
  paysFor,
  payerNames,
  candidates,
}: {
  member: Member;
  paysFor: string[];
  payerNames: string[];
  candidates: { id: string; name: string }[];
}) {
  const dark = useThemeStore((s) => s.theme === "dark");
  const [addOpen, setAddOpen] = useState(false);
  const [addPick, setAddPick] = useState("");
  const [isPending, startTransition] = useTransition();

  const type = primaryTypeOf(member.plan);
  const color = sessionTypeColor(type, dark);

  const history = [
    { date: "Sep 2, 2026", pay: member.balance > 0 ? "Not paid" : "Session package" },
    { date: "Aug 26, 2026", pay: "Session package" },
    { date: "Aug 19, 2026", pay: "Card on file" },
    { date: "Aug 12, 2026", type: "Bodpod" as SessionTypeName, pay: "Card on file" },
    { date: "Aug 5, 2026", pay: "Session package" },
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <Link href="/members" className="flex items-center gap-1.5 text-[13.5px] text-muted hover:text-fg">
        ← All members
      </Link>

      <Card className="flex flex-wrap items-start gap-[18px] px-6 py-[22px]">
        <div className="grid h-16 w-16 flex-none place-items-center rounded-full bg-accent-deep text-[21px] font-semibold text-[#e7e5fe]">
          {initialsOf(member.name)}
        </div>
        <div className="min-w-[220px] flex-1">
          <h2 className="m-0 text-[27px] font-medium tracking-tight">{member.name}</h2>
          <div className="mt-0.5 text-[13.5px] text-muted">
            Member since {member.since} · Coach {member.coach}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-row px-2.5 py-1 text-[12.5px] font-medium">{member.plan}</span>
            <span className="rounded-full bg-row px-2.5 py-1 text-[12.5px] text-muted">
              {member.plan.includes("pack") ? "7 sessions left" : "Unlimited"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium ${
                member.balance > 0 ? "bg-bad/10 text-bad" : "bg-row text-muted"
              }`}
            >
              {member.balance > 0 ? `${money(member.balance)} due` : "$0.00"}
            </span>
          </div>
        </div>
        <div className="flex flex-none gap-2">
          <Link href="/schedule" className="grid h-[38px] place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Book session
          </Link>
          <Link
            href={`/pos?member=${encodeURIComponent(member.name)}`}
            className="grid h-[38px] place-items-center rounded-full bg-accent px-[18px] text-[13.5px] font-semibold text-on-accent"
          >
            Charge account
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-[18px]">
        <Card className="px-[22px] py-5">
          <div className="mb-3 flex items-baseline justify-between gap-2.5">
            <h5 className="text-[15.5px] font-semibold">Shared accounts</h5>
            <button type="button" onClick={() => setAddOpen((o) => !o)} className="text-[12.5px] text-muted hover:text-fg">
              {addOpen ? "Cancel" : "Add"}
            </button>
          </div>
          {addOpen && (
            <div className="mb-3.5 flex gap-1.5">
              <select
                value={addPick}
                onChange={(e) => setAddPick(e.target.value)}
                className="h-[34px] min-w-0 flex-1 rounded-lg border border-divider bg-transparent px-2.5 text-[13px]"
              >
                <option value="">Choose a member…</option>
                {candidates
                  .filter((c) => !paysFor.includes(c.name))
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (!addPick) return;
                  const pick = addPick;
                  startTransition(async () => {
                    await addSharedAccount(member.id, pick);
                  });
                  setAddOpen(false);
                  setAddPick("");
                }}
                className="h-[34px] flex-none rounded-lg bg-accent px-3.5 text-[13px] font-semibold text-on-accent disabled:opacity-60"
              >
                Link
              </button>
            </div>
          )}
          {paysFor.length > 0 && (
            <>
              <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Can purchase for</div>
              <div className="mb-3.5 flex flex-col gap-1">
                {paysFor.map((n) => (
                  <div key={n} className="-mx-2 flex items-center gap-1">
                    <Link
                      href={`/members/${candidates.find((c) => c.name === n)?.id ?? ""}`}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] text-fg hover:bg-row"
                    >
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-row text-[10px] font-semibold text-muted">
                        {initialsOf(n)}
                      </span>
                      <span className="min-w-0 truncate">{n}</span>
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await removeSharedAccount(member.id, n); })}
                      title="Remove link"
                      className="grid h-[26px] w-[26px] flex-none place-items-center rounded-md text-muted hover:bg-row hover:text-fg"
                    >
                      <XIcon size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {payerNames.length > 0 && (
            <>
              <div className="mb-1.5 text-[11.5px] tracking-wider text-muted uppercase">Sessions paid by</div>
              <div className="flex flex-col gap-1">
                {payerNames.map((n) => (
                  <Link
                    key={n}
                    href={`/members/${candidates.find((c) => c.name === n)?.id ?? ""}`}
                    className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] text-fg hover:bg-row"
                  >
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-row text-[10px] font-semibold text-muted">
                      {initialsOf(n)}
                    </span>
                    <span className="min-w-0 truncate">{n}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {paysFor.length === 0 && payerNames.length === 0 && (
            <div className="text-[13px] text-pretty text-muted">No linked accounts. Add one to let someone else pay for this member&apos;s sessions.</div>
          )}
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-3 text-[15.5px] font-semibold">Contact</h5>
          <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13.5px]">
            <span className="text-muted">Phone</span>
            <span className="tabular-nums">{member.phone}</span>
            <span className="text-muted">Email</span>
            <span className="min-w-0 truncate">{member.email}</span>
            <span className="text-muted">Emergency</span>
            <span>On file</span>
            <span className="text-muted">Waiver</span>
            <span className="text-ok">Signed</span>
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-3 text-[15.5px] font-semibold">Membership</h5>
          <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13.5px]">
            <span className="text-muted">Plan</span>
            <span>{member.plan}</span>
            <span className="text-muted">Renews</span>
            <span>{member.plan.includes("membership") ? "Oct 1, 2026" : "On package completion"}</span>
            <span className="text-muted">Sessions left</span>
            <span>{member.plan.includes("pack") ? "7 sessions left" : "Unlimited"}</span>
            <span className="text-muted">Attendance</span>
            <span>92% last 90 days</span>
            <span className="text-muted">Balance</span>
            <span className={member.balance > 0 ? "text-bad" : "text-muted"}>{member.balance > 0 ? `${money(member.balance)} due` : "$0.00"}</span>
          </div>
        </Card>

        <Card className="px-[22px] py-5">
          <h5 className="mb-3 text-[15.5px] font-semibold">Notes</h5>
          <div className="text-[13.5px] text-pretty text-muted">
            Right shoulder mobility work before overhead pressing. Prefers early sessions and texts to confirm the night before.
          </div>
        </Card>
      </div>

      <Card className="px-[22px] py-5">
        <div className="mb-1.5 flex items-center justify-between gap-3.5">
          <h5 className="text-[15.5px] font-semibold">Session history</h5>
          <Link href="/schedule" className="text-[13px] text-link hover:text-link-hover">
            Open schedule
          </Link>
        </div>
        {history.map((h) => {
          const t = h.type ?? type;
          const paid = h.pay !== "Not paid";
          return (
            <div key={h.date} className="flex items-center gap-4 border-b border-divider py-2.5 last:border-b-0">
              <span className="w-[112px] flex-none text-[13.5px] tabular-nums text-muted">{h.date}</span>
              <span className="w-[66px] flex-none text-[13px] font-semibold" style={{ color: t === type ? color : sessionTypeColor(t, dark) }}>
                {SHORT_LABEL[t]}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{t}</span>
              <span className="w-[104px] flex-none text-right text-[12.5px] text-muted">{member.coach}</span>
              <span className={`w-24 flex-none rounded-md py-0.5 text-center text-[11.5px] ${paid ? "bg-ok/15 text-ok" : "bg-bad/10 text-bad"}`}>{h.pay}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
