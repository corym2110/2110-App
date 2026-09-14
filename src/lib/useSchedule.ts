"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOccurrencesForRange,
  getAttendanceForRange,
  getWaitlistDataForRange,
  type Occurrence,
} from "@/server/schedule";

export interface ScheduleRangeData {
  occurrencesByIso: Record<string, Occurrence[]>;
  attendance: Record<string, string>;
  waitlists: Record<string, string[]>;
  classAdds: Record<string, string[]>;
  loading: boolean;
  refetch: () => void;
}

/** Real schedule data (bookings, recurring series, attendance, waitlists) for every day in [fromIso, toIso]. */
export function useScheduleRange(fromIso: string, toIso: string, coachId?: string): ScheduleRangeData {
  const [occurrencesByIso, setOccurrencesByIso] = useState<Record<string, Occurrence[]>>({});
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [waitlists, setWaitlists] = useState<Record<string, string[]>>({});
  const [classAdds, setClassAdds] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    Promise.all([
      getOccurrencesForRange(fromIso, toIso, coachId),
      getAttendanceForRange(fromIso, toIso),
      getWaitlistDataForRange(fromIso, toIso),
    ]).then(([occ, att, wl]) => {
      setOccurrencesByIso(occ);
      setAttendance(att);
      setWaitlists(wl.waitlists);
      setClassAdds(wl.classAdds);
      setLoading(false);
    });
  }, [fromIso, toIso, coachId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { occurrencesByIso, attendance, waitlists, classAdds, loading, refetch };
}

export function occurrencesOn(data: ScheduleRangeData, iso: string): Occurrence[] {
  return data.occurrencesByIso[iso] ?? [];
}
