"use client";

import { useCallback, useEffect, useState } from "react";
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
