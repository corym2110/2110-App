"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCoaches, type CoachRow } from "@/server/coaches";

/** Real coach roster from the database, for client components that need it (pickers, filters, staff list). */
export function useCoaches(): CoachRow[] {
  const [coaches, setCoaches] = useState<CoachRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    getCoaches().then((rows) => {
      if (!cancelled) setCoaches(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return coaches;
}

/** Populated once, server-side, by the (shell) layout — every `useCurrentCoach()` call in the app
    reads from here instead of each independently re-fetching. Before this, every component using
    the hook (Sidebar, dashboard, reports, members list, ...) fired its own `getCurrentCoach()` call
    on mount, each one a real network round trip to Clerk (`currentUser()`, not the free local-JWT
    `auth()`) — redundant work, and a visible "loading" flash (e.g. "Good morning, there" before the
    real name arrives) on every single page load instead of just once, before first paint. */
const CurrentCoachContext = createContext<CoachRow | null | undefined>(undefined);

export function CurrentCoachProvider({ coach, children }: { coach: CoachRow | null; children: ReactNode }) {
  return <CurrentCoachContext.Provider value={coach}>{children}</CurrentCoachContext.Provider>;
}

/**
 * The coach record for the signed-in user, or `null` if their Clerk email isn't a coach.
 * `coach?.isAdmin` gates admin-only UI/routes. Resolved server-side once per page load by the
 * (shell) layout (see `CurrentCoachProvider`) — this is not the current hook's asynchronous
 * `undefined`-then-value pattern.
 */
export function useCurrentCoach(): CoachRow | null | undefined {
  return useContext(CurrentCoachContext);
}

/** Same as useCoaches(), but also returns a refetch() for callers that mutate the coach list themselves. */
export function useCoachesWithRefetch(): { coaches: CoachRow[]; refetch: () => void } {
  const [coaches, setCoaches] = useState<CoachRow[]>([]);

  const refetch = useCallback(() => {
    getCoaches().then(setCoaches);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { coaches, refetch };
}
