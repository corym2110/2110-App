"use client";

import { useEffect, useState } from "react";
import { getMembers, getMemberNames, type MemberOption } from "@/server/members";
import type { Member } from "@/types";

/** Real member roster from the database, for client components that need it (booking pickers, search, POS). */
export function useMembers(): Member[] {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    let cancelled = false;
    getMembers().then((rows) => {
      if (!cancelled) setMembers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return members;
}

/** Lighter-weight than useMembers() — just id/name, for pickers and profile links (Schedule,
    Classes) that never touch balance/risk/credits. Skips getMembers()'s much heavier per-member
    computation entirely, not just the fields it returns. */
export function useMemberNames(): MemberOption[] {
  const [members, setMembers] = useState<MemberOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    getMemberNames().then((rows) => {
      if (!cancelled) setMembers(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return members;
}
