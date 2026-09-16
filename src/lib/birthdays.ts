export interface UpcomingBirthday {
  memberId: string;
  name: string;
  monthDay: string; // "MM-DD"
  daysAway: number;
  turningAge: number;
}

/** Members with a birthday in the next `daysAhead` days (today included), soonest first. Pure
    date math over already-loaded Member data — no extra query needed since callers already have
    every member's dateOfBirth from getMembers()/useMembers(). */
export function upcomingBirthdays(
  members: { id: string; name: string; dateOfBirth?: string }[],
  daysAhead: number,
  now = new Date(),
): UpcomingBirthday[] {
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const rows: UpcomingBirthday[] = [];

  for (const m of members) {
    if (!m.dateOfBirth) continue;
    const dob = new Date(`${m.dateOfBirth}T00:00:00Z`);
    let next = new Date(Date.UTC(todayUTC.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
    if (next < todayUTC) next = new Date(Date.UTC(todayUTC.getUTCFullYear() + 1, dob.getUTCMonth(), dob.getUTCDate()));
    const daysAway = Math.round((next.getTime() - todayUTC.getTime()) / 86400000);
    if (daysAway > daysAhead) continue;
    rows.push({
      memberId: m.id,
      name: m.name,
      monthDay: `${String(dob.getUTCMonth() + 1).padStart(2, "0")}-${String(dob.getUTCDate()).padStart(2, "0")}`,
      daysAway,
      turningAge: next.getUTCFullYear() - dob.getUTCFullYear(),
    });
  }

  return rows.sort((a, b) => a.daysAway - b.daysAway);
}
