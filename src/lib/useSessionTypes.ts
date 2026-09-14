"use client";

import { useCallback, useEffect, useState } from "react";
import { getSessionTypes } from "@/server/sessionTypes";
import { SESSION_TYPES } from "@/data/mock/sessionTypes";
import type { SessionTypeDef } from "@/types";

/** Built-in + custom session types, for pickers that need the real (possibly admin-extended) list. */
export function useSessionTypes(): SessionTypeDef[] {
  const [types, setTypes] = useState<SessionTypeDef[]>(SESSION_TYPES);

  useEffect(() => {
    let cancelled = false;
    getSessionTypes().then((rows) => {
      if (!cancelled) setTypes(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return types;
}

export function useSessionTypesWithRefetch(): { sessionTypes: SessionTypeDef[]; refetch: () => void } {
  const [types, setTypes] = useState<SessionTypeDef[]>(SESSION_TYPES);

  const refetch = useCallback(() => {
    getSessionTypes().then(setTypes);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sessionTypes: types, refetch };
}
