export type ThemeName = "light" | "dark";

export type CoachId = string;

export type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

/** The six built-ins are hardcoded (see data/mock/sessionTypes.ts); admins can add custom
    ones from Settings, so this stays a plain string rather than a fixed union. */
export type SessionTypeName = string;

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

export interface Shift {
  start: number; // minutes from midnight
  end: number;
}

export interface DayHours {
  on: boolean;
  shifts: Shift[]; // supports split shifts, e.g. 6am-12pm and 3pm-7pm
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
  firstName?: string;
  lastName?: string;
  gender?: string;
  plan: string;
  coach: string; // coach full name
  lastSession: string;
  balance: number;
  since: string;
  phone: string;
  email: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
}

export type AttendanceStatus = "Checked in" | "No-show" | "Late cancel" | "Cancelled";
export type FeeDecision = "charged" | "waived";

export interface Product {
  id: string;
  name: string;
  category: "Personal Training" | "Remote Coaching" | "Memberships" | "Assessments" | "Other";
  price: number;
  meta: string;
  recur?: string;
  variablePrice?: boolean;
  /** Which service this maps to, for color-coding that matches the Schedule. Omit for items with no 1:1 session type (memberships, gift cards, apparel). */
  sessionType?: SessionTypeName;
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
