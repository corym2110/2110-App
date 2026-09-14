"use client";

import { useCallback, useEffect, useState } from "react";
import { getCoaches, getCurrentCoach, type CoachRow } from "@/server/coaches";

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

/**
 * The coach record for the signed-in user, or `undefined` while still loading and `null` once loaded
 * if there's no match (their Clerk email isn't a coach). `coach?.isAdmin` gates admin-only UI/routes.
 */
export function useCurrentCoach(): CoachRow | null | undefined {
  const [coach, setCoach] = useState<CoachRow | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getCurrentCoach().then((row) => {
      if (!cancelled) setCoach(row);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return coach;
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
