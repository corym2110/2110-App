"use client";

import { useEffect, useState } from "react";
import { getMembers } from "@/server/members";
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
