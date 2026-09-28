/** How many recent complete weeks count as "now" vs. how many weeks before that establish the
    baseline pace to compare against. Tunable — not a magic constant anyone should have to trust
    blindly, just a starting point to see how it performs live. */
const RECENT_WEEKS = 2;
const BASELINE_WEEKS = 6;
const DECLINE_RATIO = 0.5;
const MIN_BASELINE_PER_WEEK = 1;
const UPCOMING_WINDOW_DAYS = 14;

export const CHURN_RISK_WEEKS_BACK = RECENT_WEEKS + BASELINE_WEEKS;
export const CHURN_RISK_UPCOMING_DAYS = UPCOMING_WINDOW_DAYS;

export interface RiskInput {
  membershipStatus: string;
  /** Index 0 = most recent complete week, oldest last — see `getWeeklyVisitCounts`. */
  weeklyVisits: number[];
  upcomingCount: number;
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/** Rule-based, not machine-learned — at this data volume there aren't nearly enough historical
    "who actually churned and when" examples to train a real model on. Every reason returned here
    carries the real numbers behind it, so staff can judge it themselves rather than trust a score. */
export function computeRiskReasons(input: RiskInput): string[] {
  const reasons: string[] = [];

  const recent = input.weeklyVisits.slice(0, RECENT_WEEKS);
  const baseline = input.weeklyVisits.slice(RECENT_WEEKS, RECENT_WEEKS + BASELINE_WEEKS);
  const recentAvg = average(recent);
  const baselineAvg = average(baseline);

  // Skipped for a "paused" membership — staff already put it on hold for a known reason (travel,
  // injury, etc.), so a drop in visits during that window isn't a new signal, just the expected
  // result of the pause. Still applies to "none" (pay-per-session clients have no membership to
  // pause at all, so this is their only real safety net) and "active"/"failed".
  if (input.membershipStatus !== "paused" && baselineAvg >= MIN_BASELINE_PER_WEEK && recentAvg <= baselineAvg * DECLINE_RATIO) {
    reasons.push(`Visits down to ~${round1(recentAvg)}/wk, from ~${round1(baselineAvg)}/wk over the past two months.`);
  }

  if (input.membershipStatus === "failed") {
    reasons.push("Membership billing failed.");
  }

  if (input.membershipStatus === "active" && input.upcomingCount === 0) {
    reasons.push("No upcoming sessions booked.");
  }

  return reasons;
}
