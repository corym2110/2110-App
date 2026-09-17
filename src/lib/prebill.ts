/** The two session types billed ahead by period — Remote Coaching is a monthly subscription and
    Classes are membership-allotment based, both separate billing models handled elsewhere. */
export const PREBILL_TYPES = ["Personal Training", "Group Training"] as const;
export type PreBillType = (typeof PREBILL_TYPES)[number];
