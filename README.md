# 2110 Fitness — scheduling app

Real TypeScript/React implementation of the 2110 Fitness operations console: dashboard,
schedule, classes, members, POS, reports, settings, and coach preferences. This replaces
the design-reference build (the `.dc.html` prototype in the `schedule-app` repo) with an
actual app — typed data, real components, real client-side state.

## Status: v1, mock data

Every screen is fully interactive (booking, drag-to-move, check-in/no-show, waitlists,
POS cart + discounts, shared accounts, coach availability, theme) but runs on **mock
data held in this app**, persisted to the browser's `localStorage` — there is no
database and no backend yet. That's the next phase.

## Stack

- **Next.js (App Router) + TypeScript + React**
- **Tailwind CSS v4** for styling, with the Nocturne design system's tokens (colors,
  spacing, radii) as CSS custom properties in `src/app/globals.css`, switched via
  `data-theme` on `<html>`.
- **Zustand** (`persist` middleware) for state — one store per concern in `src/stores/`.

## Structure

```
src/
  app/(shell)/...     one folder per screen; layout.tsx renders the shared sidebar+header
  components/shell/   Sidebar, Header, ThemeAttribute
  components/schedule/  DayColumn, DetailPanel, BookingDialog, MonthGrid
  components/ui/      Card, Toggle, SegmentedControl, HeaderButton, icons
  data/mock/           seed data — members, coaches, recurring schedule, POS catalog, reports
  stores/              theme, attendance, waitlists, availability, sharedAccounts, bookings, notifications
  lib/                 scheduleEngine (occurrence computation), availability (offReason),
                       layoutLanes (overlap layout), time/search helpers
```

## Running it

```
npm install
npm run dev
```

Visit http://localhost:3000 — redirects to `/dashboard`.

## Next phase (not started)

Per direction from ownership: a real backend needs **Neon** (Postgres) + **Prisma** (ORM)
+ **Clerk** (auth) + **Postmark** (transactional email), deployed alongside this app on
**Vercel**. That work replaces the `src/stores/*` + `src/data/mock/*` layer with real
API routes and a database — the component layer above it shouldn't need to change much,
since screens already read from typed stores rather than inlined data.
