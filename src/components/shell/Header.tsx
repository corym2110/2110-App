"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUIStore } from "@/stores/ui";
import { useThemeStore } from "@/stores/theme";
import { useHeaderActionStore } from "@/stores/headerAction";
import { searchHits } from "@/lib/search";
import { useMembers } from "@/lib/useMembers";
import {
  MoonIcon,
  PanelToggleIcon,
  SearchIcon,
  SunIcon,
  XIcon,
} from "@/components/ui/icons";

export function Header() {
  const collapsed = useUIStore((s) => s.collapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleCollapsed);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const headerAction = useHeaderActionStore((s) => s.node);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const members = useMembers();

  useEffect(() => {
    function onMouseDown(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setSearchOpen(false);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const hits = searchHits(query, members);

  return (
    <header
      ref={rootRef}
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-5 border-b border-divider bg-surface px-[30px]"
    >
      <div className="flex min-w-0 flex-shrink items-center gap-2.5">
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid h-9 w-9 flex-none place-items-center rounded-[10px] border border-divider text-muted hover:bg-row hover:text-fg"
        >
          <PanelToggleIcon size={17} chevron={collapsed ? "m14.2 9.4 2.6 2.6-2.6 2.6" : "m17.3 9.4-2.6 2.6 2.6 2.6"} />
        </button>

        <div className="relative w-80 min-w-0 flex-shrink">
          <div
            className={`flex h-9 items-center gap-2.5 overflow-hidden rounded-[10px] border px-3.5 text-muted ${
              searchOpen ? "border-accent" : "border-divider"
            }`}
          >
            <SearchIcon size={16} className="flex-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search members, sessions, pages"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-fg outline-none placeholder:text-muted"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="grid h-5 w-5 flex-none place-items-center rounded-full bg-row text-muted"
              >
                <XIcon size={11} />
              </button>
            )}
          </div>
          {searchOpen && query.trim() && (
            <div className="popover-shadow absolute left-0 top-[42px] z-[60] w-full min-w-[300px] overflow-hidden rounded-xl bg-surface">
              <div className="max-h-[340px] overflow-y-auto">
                {hits.map((s) => (
                  <Link
                    key={s.href + s.title}
                    href={s.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-2.5 border-b border-divider px-3.5 py-2.5 text-fg hover:bg-row"
                  >
                    <span
                      className="grid h-[26px] w-[26px] flex-none place-items-center bg-row text-[10.5px] font-semibold text-muted"
                      style={{ borderRadius: s.radius }}
                    >
                      {s.badge}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px]">{s.title}</span>
                      <span className="block truncate text-[11.5px] text-muted">{s.sub}</span>
                    </span>
                  </Link>
                ))}
                {hits.length === 0 && (
                  <div className="px-3.5 py-5 text-center text-[13px] text-muted">No matches for &quot;{query}&quot;.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 items-center gap-2 rounded-full border border-divider px-3.5 text-[13px] text-fg hover:bg-row"
        >
          <span className="grid h-4 w-4 place-items-center">{theme === "dark" ? <MoonIcon size={16} /> : <SunIcon size={16} />}</span>
          {theme === "dark" ? "Dark" : "Light"}
        </button>

        {headerAction}
      </div>
    </header>
  );
}
