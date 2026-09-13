import { initialsOf } from "@/lib/time";
import type { Member } from "@/types";

export interface SearchHit {
  title: string;
  sub: string;
  href: string;
  badge: string;
  radius: string;
}

const PAGES: [string, string, string][] = [
  ["Dashboard", "Today's overview", "/dashboard"],
  ["Schedule", "Day, week and month calendar", "/schedule"],
  ["Members", "Member list and profiles", "/members"],
  ["POS", "Point of sale", "/pos"],
  ["Reports", "Revenue, sessions, coaches", "/reports"],
  ["Settings", "Facility, staff, services", "/settings"],
  ["My preferences", "Hours, time off, notifications", "/preferences"],
];

const SESSION_HINTS: [string, string][] = [
  ["Personal Training", "Session type · 60 min"],
  ["Group Training", "Session type · 60 min · up to 8"],
  ["Class", "Session type · 60 min · up to 12"],
  ["Remote Consult", "Session type · 15 min"],
  ["Bodpod", "Session type · 30 min"],
  ["Blueprint and Baseline", "Session type · 90 min · no charge"],
];

export function buildSearchIndex(members: Member[]): SearchHit[] {
  const memberHits: SearchHit[] = members.map((m) => ({
    title: m.name,
    sub: "Member profile",
    badge: initialsOf(m.name),
    radius: "999px",
    href: `/members/${m.id}`,
  }));
  const pageHits: SearchHit[] = PAGES.map(([title, sub, href]) => ({ title, sub, href, badge: "→", radius: "8px" }));
  const sessionHits: SearchHit[] = SESSION_HINTS.map(([title, sub]) => ({
    title,
    sub,
    href: "/schedule",
    badge: "◷",
    radius: "8px",
  }));
  return [...memberHits, ...sessionHits, ...pageHits];
}

export function searchHits(query: string, members: Member[], limit = 8): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return buildSearchIndex(members)
    .filter((i) => i.title.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q))
    .slice(0, limit);
}
