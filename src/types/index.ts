export type ThemeName = "light" | "dark";

export type CoachId = "CM" | "JT" | "AR";

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type SessionTypeName =
  | "Personal Training"
  | "Group Training"
  | "Class"
  | "Remote Consult"
  | "Bodpod"
  | "Blueprint and Baseline";

export interface SessionTypeDef {
  name: SessionTypeName;
  duration: number; // minutes
  capacity: number; // 0 = no cap (1:1)
  recurring: boolean;
  price: number;
}

export interface Coach {
  id: CoachId;
  name: string;
  initials: string;
  role: string;
  email: string;
  active: boolean;
}

export interface DayHours {
  on: boolean;
  start: number; // minutes from midnight
  end: number;
}

export interface TimeOffEntry {
  from: string; // YYYY-MM-DD
  to: string;
  reason: string;
  type: "Full days" | "Partial day";
}

export interface CoachAvailability {
  hours: Record<DayOfWeek, DayHours>;
  timeOff: TimeOffEntry[];
}

export interface Member {
  id: string;
  name: string;
  plan: string;
  coach: string; // coach full name
  lastSession: string;
  balance: number;
  since: string;
  phone: string;
  email: string;
}

/** Recurring weekly template row, as booked into the schedule. */
export interface RecurringRow {
  id: string;
  dow: number; // 0=Mon..6=Sun
  start: number; // minutes from midnight
  duration: number;
  name: string; // client name, or session title for group/class ("" for generic Group Training)
  type: SessionTypeName;
  coach: CoachId;
  roster?: string[]; // present for group/class sessions
}

export type AttendanceStatus = "Checked in" | "No-show" | "Late cancel" | "Cancelled";
export type FeeDecision = "charged" | "waived";

export interface Product {
  id: string;
  name: string;
  category: "Personal Training" | "Memberships" | "Assessments" | "Other";
  price: number;
  meta: string;
  recur?: string;
  variablePrice?: boolean;
}

export interface CartLine {
  productId: string;
  qty: number;
  overridePrice?: number;
}

export interface NotificationItem {
  id: string;
  text: string;
  when: string;
  initials: string;
  memberName: string;
}
