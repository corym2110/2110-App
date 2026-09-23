"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUIStore } from "@/stores/ui";
import { useThemeStore } from "@/stores/theme";
import { useHeaderActionStore } from "@/stores/headerAction";
import { getNotificationsForCoach, markAllNotificationsRead, type NotificationRow } from "@/server/notifications";
import { useCurrentCoach } from "@/lib/useCoaches";
import { searchHits } from "@/lib/search";
import { useMembers } from "@/lib/useMembers";
import { formatDateTime } from "@/lib/time";
import {
  BellIcon,
  MoonIcon,
  PanelToggleIcon,
  SearchIcon,
  SunIcon,
  XIcon,
} from "@/components/ui/icons";

const TYPE_INITIALS: Record<string, string> = {
  booking: "BK",
  classJoin: "CJ",
  cancelled: "CX",
  waitlistOpen: "WL",
};

export function Header() {
  const collapsed = useUIStore((s) => s.collapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleCollapsed);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const headerAction = useHeaderActionStore((s) => s.node);
  const coach = useCurrentCoach();

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const members = useMembers();

  const coachId = coach?.id;
  function refetchNotifications() {
    if (coachId) getNotificationsForCoach(coachId).then(setNotifications);
  }
  useEffect(refetchNotifications, [coachId]);

  useEffect(() => {
    function onMouseDown(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
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
  const unread = notifications.filter((n) => !n.read).length;

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

        <div className="relative flex-none">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o);
              refetchNotifications();
            }}
            title="Notifications"
            className={`relative grid h-9 w-9 place-items-center rounded-full border hover:bg-row hover:text-fg ${
              notifOpen ? "border-accent bg-row text-fg" : "border-divider text-muted"
            }`}
          >
            <BellIcon size={17} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="popover-shadow absolute right-0 top-11 z-[60] w-[344px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5">
                <span className="text-[14.5px] font-semibold">Notifications</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!coach) return;
                    setNotifications((rows) => rows.map((r) => ({ ...r, read: true })));
                    markAllNotificationsRead(coach.id);
                  }}
                  className="text-[12.5px] text-muted hover:text-fg"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[390px] overflow-y-auto">
                {notifications.map((n) => {
                  const body = (
                    <>
                      <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-row text-[11px] font-semibold text-muted">
                        {TYPE_INITIALS[n.type] ?? "•"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] text-pretty">{n.text}</span>
                        <span className="mt-px block text-xs text-muted">{formatDateTime(new Date(n.createdAt))}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full bg-accent" />}
                    </>
                  );
                  const rowClass = `flex gap-2.5 border-b border-divider px-4 py-3.5 text-fg hover:bg-row ${n.read ? "" : "bg-accent/5"}`;
                  return n.memberId ? (
                    <Link key={n.id} href={`/members/${n.memberId}`} className={rowClass}>
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id} className={rowClass}>
                      {body}
                    </div>
                  );
                })}
                {notifications.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-muted">No notifications yet.</div>}
              </div>
              <Link href="/preferences" className="block px-4 py-3 text-center text-[12.5px] text-link hover:text-link-hover">
                Notification settings
              </Link>
            </div>
          )}
        </div>

        {headerAction}
      </div>
    </header>
  );
}
