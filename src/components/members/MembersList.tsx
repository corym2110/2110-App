"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { PlusIcon } from "@/components/ui/icons";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { initialsOf, money } from "@/lib/time";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import type { Member } from "@/types";

type Filter = "All" | "Balance due" | "Packages" | "Memberships";
const FILTERS: Filter[] = ["All", "Balance due", "Packages", "Memberships"];

export function MembersList({ members }: { members: Member[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [addOpen, setAddOpen] = useState(false);

  useHeaderAction(
    <HeaderButton onClick={() => setAddOpen(true)}>
      <PlusIcon size={15} />
      Add member
    </HeaderButton>,
  );

  const visible = members.filter((m) => {
    if (filter === "Balance due") return m.balance > 0;
    if (filter === "Packages") return m.plan.includes("pack");
    if (filter === "Memberships") return m.plan.includes("membership") || m.plan.includes("Remote");
    return true;
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Members</h2>
          <div className="text-[13.5px] text-muted">
            {visible.length} of {members.length} members
          </div>
        </div>
        <div className="ml-auto flex gap-1 rounded-[11px] border border-divider p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] ${
                filter === f ? "bg-row font-semibold text-fg" : "text-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden py-1.5">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_108px] gap-3.5 border-b border-divider px-[22px] py-2.5 text-[11px] tracking-wider text-muted uppercase">
          <span>Member</span>
          <span>Plan</span>
          <span>Coach</span>
          <span>Last session</span>
          <span className="text-right">Balance</span>
        </div>
        {visible.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_108px] items-center gap-3.5 border-b border-divider px-[22px] py-3 text-fg last:border-b-0 hover:bg-row"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-row text-[11.5px] font-semibold text-muted">
                {initialsOf(m.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-medium">{m.name}</span>
                <span className="block truncate text-xs text-muted">{m.email}</span>
              </span>
            </span>
            <span className="min-w-0 truncate text-[13.5px]">{m.plan}</span>
            <span className="min-w-0 truncate text-[13.5px] text-muted">{m.coach}</span>
            <span className="min-w-0 truncate text-[13.5px] text-muted">{m.lastSession}</span>
            <span className={`text-right text-[13px] font-medium tabular-nums ${m.balance > 0 ? "text-bad" : "text-muted"}`}>
              {m.balance > 0 ? `${money(m.balance)} due` : "$0.00"}
            </span>
          </Link>
        ))}
      </Card>

      {addOpen && <AddMemberDialog onClose={() => setAddOpen(false)} />}
    </div>
  );
}
