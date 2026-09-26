import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@/types";
import { COACH_ROLES } from "@/lib/roles";
import { IsoDateSchema } from "@/lib/validate";
import { PREBILL_TYPES } from "@/lib/prebill";

export const ProductInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  category: z.enum(PRODUCT_CATEGORIES),
  price: z.number().min(0, "Price must be 0 or more."),
  meta: z.string().trim().max(120),
  recur: z.string().trim().max(40).optional(),
  variablePrice: z.boolean().optional(),
  sessionType: z.string().trim().max(60).optional(),
  coachId: z.string().min(1).optional(),
});
export type ProductInput = z.infer<typeof ProductInputSchema>;

export const NewSessionTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  duration: z.number().int("Duration must be a whole number of minutes.").min(5, "Duration must be at least 5 minutes."),
  capacity: z.number().int("Capacity must be a whole number.").min(0, "Capacity can't be negative."),
  price: z.number().min(0, "Price must be 0 or more."),
  recurring: z.boolean(),
});
export type NewSessionTypeInput = z.infer<typeof NewSessionTypeInputSchema>;

export const NewCoachInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  role: z.enum(COACH_ROLES, { message: "Invalid role." }),
});
export type NewCoachInput = z.infer<typeof NewCoachInputSchema>;

export const CoachPreferencesInputSchema = z.object({
  notifyFlags: z.object({
    dayAhead: z.boolean(),
    manualBooking: z.boolean(),
    classJoin: z.boolean(),
  }),
  landing: z.string().trim().min(1).max(40),
  calendarView: z.string().trim().min(1).max(40),
});
export type CoachPreferencesInput = z.infer<typeof CoachPreferencesInputSchema>;

export const CommissionRateSchema = z
  .number()
  .min(0, "Commission rate must be between 0% and 100%.")
  .max(1, "Commission rate must be between 0% and 100%.");

export const SALE_METHODS = ["Card", "Cash", "E-transfer", "Package credit", "Invoice"] as const;

export const SaleLineItemSchema = z.object({
  description: z.string().trim().min(1, "Line item description is required.").max(200),
  quantity: z.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1."),
  // Intentionally not min(0) — a discount line is a real negative unitPrice (e.g. { description: "Discount", unitPrice: -12.5 }).
  unitPrice: z.number().finite(),
});
export type SaleLineItem = z.infer<typeof SaleLineItemSchema>;

export const NewSaleInputSchema = z.object({
  memberId: z.string().min(1).optional(),
  coachId: z.string().min(1).optional(),
  summary: z.string().trim().min(1, "Summary is required.").max(500),
  total: z.number().min(0, "Total can't be negative."),
  method: z.enum(SALE_METHODS, { message: "Invalid payment method." }),
  paid: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
  lineItems: z.array(SaleLineItemSchema).max(100).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});
export type NewSaleInput = z.infer<typeof NewSaleInputSchema>;

export const ReportRangeKeySchema = z.enum(["This week", "This month", "Last 90 days", "Year to date"], {
  message: "Invalid report range.",
});
export const DashboardRangeKeySchema = z.enum(["Day", "Week", "Month"], { message: "Invalid range." });

/** Shared by addMember and updateMemberDetails — identical shape, two names for compatibility
    with existing importers. */
export const MemberDetailsInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  phone: z.string().trim().min(1, "Phone is required.").max(30),
  gender: z.string().trim().min(1, "Gender is required.").max(30),
  address: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  dateOfBirth: IsoDateSchema.optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type NewMemberInput = z.infer<typeof MemberDetailsInputSchema>;
export type MemberDetailsInput = z.infer<typeof MemberDetailsInputSchema>;

export const SetMembershipInputSchema = z.object({
  name: z.string().trim().min(1, "Membership name is required.").max(100),
  price: z.number().gt(0, "Membership price must be greater than 0."),
  nextBillDate: IsoDateSchema,
});
export type SetMembershipInput = z.infer<typeof SetMembershipInputSchema>;

const MergeMembersFieldsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  phone: z.string().trim().min(1, "Phone is required.").max(30),
  gender: z.string().trim().min(1, "Gender is required.").max(30),
  address: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().max(20).optional(),
  city: z.string().trim().max(100).optional(),
  province: z.string().trim().max(100).optional(),
  plan: z.string().trim().min(1, "Plan is required.").max(100),
  since: z.string().trim().min(1).max(40),
  coachId: z.string().min(1).optional(),
});

export const MergeMembersInputSchema = z.object({
  keepId: z.string().min(1, "Pick two different members."),
  removeId: z.string().min(1, "Pick two different members."),
  fields: MergeMembersFieldsSchema,
});
export type MergeMembersInput = z.infer<typeof MergeMembersInputSchema>;

export const BusinessSettingsDTOSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required.").max(120),
  address: z.string().trim().max(200),
  phone: z.string().trim().max(30),
  timezone: z.string().trim().min(1).max(60),
  opens: z.string().trim().min(1).max(20),
  closes: z.string().trim().min(1).max(20),
  bookingIncrement: z.string().trim().min(1).max(20),
  calendarView: z.string().trim().min(1).max(20),
  bookingFlags: z.object({
    selfBook: z.boolean(),
    waitlist: z.boolean(),
    requireCard: z.boolean(),
  }),
  currency: z.string().trim().min(1).max(10),
  salesTax: z.string().trim().max(40),
  hourlyPayRate: z.number().min(0, "Hourly pay rate can't be negative."),
  paymentsFlags: z.object({
    emailReceipt: z.boolean(),
    autoCharge: z.boolean(),
    packageAlert: z.boolean(),
    dailySummary: z.boolean(),
  }),
  notifyFlags: z.object({
    reminder: z.boolean(),
    cancelNotice: z.boolean(),
    waitlistOpen: z.boolean(),
    birthday: z.boolean(),
    marketing: z.boolean(),
  }),
  reminderTiming: z.string().trim().min(1).max(40),
  packageWarning: z.string().trim().max(40),
  dailySummaryTo: z.string().trim().min(1, "Daily summary email is required.").email("Enter a valid email address."),
});
export type BusinessSettingsDTO = z.infer<typeof BusinessSettingsDTOSchema>;

export const WaiverTypeSchema = z.enum(["Adult Liability Waiver", "Youth Waiver"], { message: "Invalid waiver type." });

export const SignWaiverInputSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
  waiverType: WaiverTypeSchema,
  signerName: z.string().trim().min(1, "Signer name is required.").max(100),
  minorName: z.string().trim().max(100).optional(),
  pickupNames: z.array(z.string().trim().max(100)).max(20).optional(),
  // A canvas-drawn signature, base64 data URL — capped well above any real signature's size to
  // block abuse without ever rejecting a legitimate one.
  signatureDataUrl: z.string().min(1, "Signature is required.").max(2_000_000, "Signature image is too large."),
  signedByCoachId: z.string().min(1).optional(),
});
export type SignWaiverInput = z.infer<typeof SignWaiverInputSchema>;

/** The card summary as reported by Clover.js's `createToken()` on the client — the browser has
    this from the raw card entry, before it's ever tokenized, so it's the one place brand/last4/
    expiry are actually available (Clover's server-side customer API never returns them). */
export const TokenizedCardSummarySchema = z.object({
  brand: z.string().trim().min(1, "Card brand is required.").max(30),
  last4: z.string().regex(/^\d{4}$/, "Card last4 must be exactly 4 digits."),
  expMonth: z.string().regex(/^(0?[1-9]|1[0-2])$/, "Invalid expiry month."),
  expYear: z.string().regex(/^\d{2}(\d{2})?$/, "Invalid expiry year."),
});
export type TokenizedCardSummary = z.infer<typeof TokenizedCardSummarySchema>;

/** $100,000 in cents — generous headroom above any real PT/membership charge, just enough to
    block an absurd/attack payload before it ever reaches Clover. */
export const AmountCentsSchema = z.number().int("Amount must be a whole number of cents.").positive("Amount must be greater than 0.").max(10_000_000, "Amount is too large.");

export const PreBillSaleItemSchema = z.object({
  sessionType: z.enum(PREBILL_TYPES, { message: "Invalid session type." }),
  unitPrice: z.number().min(0, "Unit price can't be negative."),
  quantity: z.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(1000),
  coachId: z.string().min(1).optional(),
});
export const PreBillSaleItemsSchema = z.array(PreBillSaleItemSchema).max(200);

export const MinuteSchema = z.number().int("Must be a whole number of minutes.").min(0).max(1439);
const MINUTE = MinuteSchema;

// Booking/series "name"/"clientName" is intentionally NOT required — for Group Training/Class
// types it's an optional title (BookingDialog shows "Optional title" as the placeholder), so an
// empty string is valid and always has been; only capped for size here, not required non-empty.
export const NewBookingInputSchema = z.object({
  iso: IsoDateSchema,
  start: MINUTE,
  duration: z.number().int("Duration must be a whole number of minutes.").min(5, "Duration must be at least 5 minutes.").max(480),
  type: z.string().trim().min(1, "Type is required.").max(60),
  capacity: z.number().int().min(0).optional(),
  coachId: z.string().min(1, "Coach is required."),
  name: z.string().trim().max(200),
  roster: z.array(z.string().trim().max(100)).max(100).optional(),
});
export type NewBookingInput = z.infer<typeof NewBookingInputSchema>;
export const BookingPatchSchema = NewBookingInputSchema.partial();

export const NewSeriesInputSchema = z.object({
  clientName: z.string().trim().max(200),
  type: z.string().trim().min(1, "Type is required.").max(60),
  capacity: z.number().int().min(0).optional(),
  coachId: z.string().min(1, "Coach is required."),
  duration: z.number().int("Duration must be a whole number of minutes.").min(5, "Duration must be at least 5 minutes.").max(480),
  days: z.object({
    Mon: MINUTE.optional(),
    Tue: MINUTE.optional(),
    Wed: MINUTE.optional(),
    Thu: MINUTE.optional(),
    Fri: MINUTE.optional(),
    Sat: MINUTE.optional(),
    Sun: MINUTE.optional(),
  }),
  fromIso: IsoDateSchema,
  toIso: IsoDateSchema.optional(),
});
export type NewSeriesInput = z.infer<typeof NewSeriesInputSchema>;

export const MoveOccurrenceOccSchema = z.object({
  sourceId: z.string().min(1),
  key: z.string().min(1),
  type: z.string().trim().min(1).max(60),
  duration: z.number().int().min(5).max(480),
  capacity: z.number().int().min(0),
  name: z.string().trim().max(200),
  roster: z.array(z.string().trim().max(100)).max(100).optional(),
});

const ATTENDANCE_STATUSES = ["Checked in", "No-show", "Late cancel", "Cancelled"] as const;
export const AttendanceStatusSchema = z.enum(ATTENDANCE_STATUSES, { message: "Invalid attendance status." }).nullable();

export const ShiftSchema = z.object({
  start: MINUTE,
  end: MINUTE,
});
export type Shift = z.infer<typeof ShiftSchema>;

export const DayHoursDTOSchema = z.object({
  on: z.boolean(),
  shifts: z.array(ShiftSchema).max(10),
});
export type DayHoursDTO = z.infer<typeof DayHoursDTOSchema>;

export const WeeklyHoursSchema = z.object({
  Mon: DayHoursDTOSchema,
  Tue: DayHoursDTOSchema,
  Wed: DayHoursDTOSchema,
  Thu: DayHoursDTOSchema,
  Fri: DayHoursDTOSchema,
  Sat: DayHoursDTOSchema,
  Sun: DayHoursDTOSchema,
});
export type WeeklyHours = z.infer<typeof WeeklyHoursSchema>;

export const OccurrenceKeySchema = z.string().min(1, "Invalid occurrence.");
export const MemberNameSchema = z.string().trim().min(1, "Member name is required.").max(100);

export const TimeOffEntrySchema = z.object({
  from: IsoDateSchema,
  to: IsoDateSchema,
  reason: z.string().trim().max(500),
  type: z.enum(["Full days", "Partial day"], { message: "Invalid time off type." }),
});
