"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { PlusIcon } from "@/components/ui/icons";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useCurrentCoach } from "@/lib/useCoaches";
import { initialsOf } from "@/lib/time";
import { AddMemberDialog } from "@/components/members/AddMemberDialog";
import { MergeMembersDialog } from "@/components/members/MergeMembersDialog";
import type { Member } from "@/types";

type Filter = "All" | "Balance due" | "Packages" | "Memberships";
const FILTERS: Filter[] = ["All", "Balance due", "Packages", "Memberships"];
const PAGE_SIZE = 10;

export function MembersList({ members }: { members: Member[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const coach = useCurrentCoach();

  useHeaderAction(
    <div className="flex gap-2">
      {coach?.isAdmin && (
        <button
          type="button"
          onClick={() => setMergeOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-full border border-divider px-3.5 text-[13px] hover:bg-row"
        >
          Merge duplicates
        </button>
      )}
      <HeaderButton onClick={() => setAddOpen(true)}>
        <PlusIcon size={15} />
        Add member
      </HeaderButton>
    </div>,
  );

  const filtered = members.filter((m) => {
    if (filter === "Balance due") return m.balance > 0;
    if (filter === "Packages") return m.plan.includes("pack");
    if (filter === "Memberships") return m.plan.includes("membership") || m.plan.includes("Remote");
    return true;
  });

  const query = search.trim().toLowerCase();
  const visible = query ? filtered.filter((m) => m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)) : filtered;

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function changeFilter(f: Filter) {
    setFilter(f);
    setPage(0);
  }
  function changeSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

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
              onClick={() => changeFilter(f)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] ${
                filter === f ? "bg-row font-semibold text-fg" : "text-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => changeSearch(e.target.value)}
        placeholder="Search members by name or email…"
        className="h-10 w-full max-w-[360px] rounded-lg border border-divider bg-transparent px-3 text-sm"
      />

      <Card className="overflow-hidden py-1.5">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3.5 border-b border-divider px-[22px] py-2.5 text-[11px] tracking-wider text-muted uppercase">
          <span>Member</span>
          <span>Phone</span>
          <span>Last booking</span>
        </div>
        {pageRows.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3.5 border-b border-divider px-[22px] py-3 text-fg last:border-b-0 hover:bg-row"
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
            <span className="min-w-0 truncate text-[13.5px] text-muted">{m.phone || "—"}</span>
            <span className="min-w-0 truncate text-[13.5px] text-muted">{m.lastSession}</span>
          </Link>
        ))}
        {pageRows.length === 0 && <div className="px-[22px] py-10 text-center text-[13.5px] text-muted">No members match.</div>}
      </Card>

      {visible.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-[13.5px]">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="h-9 rounded-full border border-divider px-4 hover:bg-row disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-muted">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            className="h-9 rounded-full border border-divider px-4 hover:bg-row disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {addOpen && <AddMemberDialog onClose={() => setAddOpen(false)} />}
      {mergeOpen && <MergeMembersDialog members={members} onClose={() => setMergeOpen(false)} />}
    </div>
  );
}
