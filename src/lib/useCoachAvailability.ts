"use client";

import { useCallback, useEffect, useState } from "react";
import { getCoachAvailability, getAvailabilityForCoaches, type CoachAvailabilityDTO } from "@/server/schedule";

const EMPTY: CoachAvailabilityDTO = {
  hours: {
    Mon: { on: false, shifts: [] },
    Tue: { on: false, shifts: [] },
    Wed: { on: false, shifts: [] },
    Thu: { on: false, shifts: [] },
    Fri: { on: false, shifts: [] },
    Sat: { on: false, shifts: [] },
    Sun: { on: false, shifts: [] },
  },
  timeOff: [],
};

export function useCoachAvailability(coachId: string): { availability: CoachAvailabilityDTO; refetch: () => void } {
  const [availability, setAvailability] = useState<CoachAvailabilityDTO>(EMPTY);

  const refetch = useCallback(() => {
    if (!coachId) return;
    getCoachAvailability(coachId).then(setAvailability);
  }, [coachId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { availability, refetch };
}

/** Availability for several coaches at once — used to render "closed" bands across a whole schedule view. */
export function useAvailabilityForCoaches(coachIds: string[]): Record<string, CoachAvailabilityDTO> {
  const [byCoach, setByCoach] = useState<Record<string, CoachAvailabilityDTO>>({});
  const key = coachIds.slice().sort().join(",");

  useEffect(() => {
    if (!key) return;
    getAvailabilityForCoaches(key.split(",")).then(setByCoach);
  }, [key]);

  return key ? byCoach : {};
}
