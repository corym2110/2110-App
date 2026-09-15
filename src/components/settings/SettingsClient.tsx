"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { PlusIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useCoachesWithRefetch } from "@/lib/useCoaches";
import { AddCoachDialog } from "@/components/settings/AddCoachDialog";
import { AddSessionTypeDialog } from "@/components/settings/AddSessionTypeDialog";
import { initialsOf } from "@/lib/time";
import { sessionTypeColor } from "@/data/mock/sessionTypes";
import { useSessionTypesWithRefetch } from "@/lib/useSessionTypes";
import { matchProduct } from "@/data/mock/catalog";
import { useThemeStore } from "@/stores/theme";
import { useBusinessSettings, DEFAULT_BUSINESS_SETTINGS } from "@/lib/useBusinessSettings";
import { saveBusinessSettings, type BusinessSettingsDTO } from "@/server/settings";

type Tab = "Facility" | "Staff" | "Services" | "Payments" | "Notifications";

const TAB_LABELS: Record<Tab, string> = {
  Facility: "Business details, hours and booking rules",
  Staff: "Coaches and admin access",
  Services: "Session types, lengths and pricing",
  Payments: "Tax, terminals and receipts",
  Notifications: "Member reminders and internal alerts",
};

export function SettingsClient() {
  const [tab, setTab] = useState<Tab>("Facility");
  const [saved, setSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const dark = useThemeStore((s) => s.theme === "dark");
  const { settings, refetch: refetchSettings } = useBusinessSettings();
  const [override, setOverride] = useState<BusinessSettingsDTO | null>(null);
  const values = override ?? settings ?? DEFAULT_BUSINESS_SETTINGS;

  function patch(p: Partial<BusinessSettingsDTO>) {
    setOverride({ ...values, ...p });
    setSaved(false);
  }
  function patchBookingFlag(key: keyof BusinessSettingsDTO["bookingFlags"]) {
    patch({ bookingFlags: { ...values.bookingFlags, [key]: !values.bookingFlags[key] } });
  }
  function patchPaymentsFlag(key: keyof BusinessSettingsDTO["paymentsFlags"]) {
    patch({ paymentsFlags: { ...values.paymentsFlags, [key]: !values.paymentsFlags[key] } });
  }
  function patchNotifyFlag(key: keyof BusinessSettingsDTO["notifyFlags"]) {
    patch({ notifyFlags: { ...values.notifyFlags, [key]: !values.notifyFlags[key] } });
  }

  const { coaches, refetch: refetchCoaches } = useCoachesWithRefetch();
  const [addCoachOpen, setAddCoachOpen] = useState(false);
  const { sessionTypes, refetch: refetchSessionTypes } = useSessionTypesWithRefetch();
  const [addSessionTypeOpen, setAddSessionTypeOpen] = useState(false);

  function saveChanges() {
    startSaving(async () => {
      await saveBusinessSettings(values);
      setOverride(null);
      refetchSettings();
      setSaved(true);
    });
  }

  useHeaderAction(
    <HeaderButton onClick={saveChanges} disabled={isSaving}>
      {isSaving ? "Saving…" : saved ? "Saved" : "Save changes"}
    </HeaderButton>,
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="m-0 mb-0.5 text-[28px] font-medium tracking-tight">Settings</h2>
          <div className="text-[13.5px] text-muted">{TAB_LABELS[tab]}</div>
        </div>
        <div className="ml-auto flex flex-wrap gap-1 rounded-[11px] border border-divider p-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] ${tab === t ? "bg-row font-semibold text-fg" : "text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Facility" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-[18px]">
          <Card className="flex flex-col gap-3.5 px-[22px] py-5">
            <h5 className="text-[15.5px] font-semibold">Facility</h5>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Business name</span>
              <input
                value={values.businessName}
                onChange={(e) => patch({ businessName: e.target.value })}
                className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Address</span>
              <input
                value={values.address}
                onChange={(e) => patch({ address: e.target.value })}
                className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Phone</span>
                <input
                  value={values.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Time zone</span>
                <Select
                  value={values.timezone}
                  onChange={(v) => patch({ timezone: v })}
                  options={["Mountain (MDT)", "Pacific (PDT)", "Central (CDT)", "Eastern (EDT)"].map((v) => ({ value: v, label: v }))}
                  className="h-[38px] rounded-lg px-2 text-sm"
                />
              </label>
            </div>
          </Card>

          <Card className="flex flex-col gap-3.5 px-[22px] py-5">
            <h5 className="text-[15.5px] font-semibold">Hours &amp; calendar</h5>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Opens</span>
                <input
                  value={values.opens}
                  onChange={(e) => patch({ opens: e.target.value })}
                  className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Closes</span>
                <input
                  value={values.closes}
                  onChange={(e) => patch({ closes: e.target.value })}
                  className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Booking increment</span>
              <Select
                value={values.bookingIncrement}
                onChange={(v) => patch({ bookingIncrement: v })}
                options={["5 minutes", "10 minutes", "15 minutes", "30 minutes"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Default calendar view</span>
              <Select
                value={values.calendarView}
                onChange={(v) => patch({ calendarView: v })}
                options={["Week", "Day", "Month"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
          </Card>

          <Card className="px-[22px] py-5">
            <h5 className="mb-1 text-[15.5px] font-semibold">Booking rules</h5>
            {(
              [
                { key: "selfBook", label: "Members can self-book", hint: "Booking opens 14 days ahead in the member app" },
                { key: "waitlist", label: "Waitlists on full sessions", hint: "Members are promoted automatically when a spot frees up" },
                { key: "requireCard", label: "Require card on file", hint: "Members must save a card before booking" },
              ] as const
            ).map((t) => (
              <div key={t.key} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px]">{t.label}</div>
                  <div className="text-pretty text-xs text-muted">{t.hint}</div>
                </div>
                <Toggle on={values.bookingFlags[t.key]} onClick={() => patchBookingFlag(t.key)} label={t.label} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "Staff" && (
        <Card className="overflow-hidden py-1.5">
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-3.5 border-b border-divider px-[22px] py-3 text-[11px] tracking-wider text-muted uppercase">
            <span>Staff</span>
            <span className="text-center">Status</span>
          </div>
          {coaches.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3.5 border-b border-divider px-[22px] py-3.5 last:border-b-0">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-row text-[11.5px] font-semibold text-muted">{initialsOf(c.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[14.5px] font-medium">{c.name}</span>
                    {c.isAdmin && <span className="flex-none rounded-full bg-accent/15 px-2 py-0.5 text-[10.5px] font-semibold text-accent">Admin</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{c.email}</span>
                </span>
              </span>
              <span className={`rounded-md py-0.5 text-center text-[11.5px] ${c.active ? "bg-ok/15 text-ok" : "bg-row text-muted"}`}>
                {c.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
          {coaches.length === 0 && <div className="px-[22px] py-6 text-[13.5px] text-muted">No coaches yet.</div>}
          <div className="px-[22px] py-3.5">
            <button
              type="button"
              onClick={() => setAddCoachOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row"
            >
              <PlusIcon size={14} />
              Add coach
            </button>
          </div>
        </Card>
      )}
      {addCoachOpen && <AddCoachDialog onClose={() => setAddCoachOpen(false)} onAdded={refetchCoaches} />}

      {tab === "Services" && (
        <Card className="overflow-hidden py-1.5">
          <div className="grid grid-cols-[minmax(0,1.5fr)_108px_116px_minmax(0,1fr)] gap-3.5 border-b border-divider px-[22px] py-3 text-[11px] tracking-wider text-muted uppercase">
            <span>Session type</span>
            <span className="text-right">Default length</span>
            <span className="text-right">Price</span>
            <span>Capacity</span>
          </div>
          {sessionTypes.map((t) => {
            const product = matchProduct(t.name);
            const price = product?.price ?? t.price;
            return (
              <div key={t.name} className="grid grid-cols-[minmax(0,1.5fr)_108px_116px_minmax(0,1fr)] items-center gap-3.5 border-b border-divider px-[22px] py-3.5 last:border-b-0">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: sessionTypeColor(t.name, dark) }} />
                  <span className="min-w-0 truncate text-sm">{t.name}</span>
                </span>
                <span className="text-right text-[13.5px] tabular-nums">{t.duration} min</span>
                <span className="text-right text-[13.5px] font-medium tabular-nums">{price ? `$${price.toFixed(2)}` : "No charge"}</span>
                <span className="text-[13.5px] text-muted">{t.capacity ? `Up to ${t.capacity}` : "1 client"}</span>
              </div>
            );
          })}
          <div className="px-[22px] py-3.5">
            <button
              type="button"
              onClick={() => setAddSessionTypeOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row"
            >
              <PlusIcon size={14} />
              Add session type
            </button>
          </div>
        </Card>
      )}
      {addSessionTypeOpen && <AddSessionTypeDialog onClose={() => setAddSessionTypeOpen(false)} onAdded={refetchSessionTypes} />}

      {tab === "Payments" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-[18px]">
          <Card className="flex flex-col gap-3.5 px-[22px] py-5">
            <h5 className="text-[15.5px] font-semibold">Payments</h5>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Currency</span>
                <Select
                  value={values.currency}
                  onChange={(v) => patch({ currency: v })}
                  options={["CAD", "USD"].map((v) => ({ value: v, label: v }))}
                  className="h-[38px] rounded-lg px-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Sales tax</span>
                <input
                  value={values.salesTax}
                  onChange={(e) => patch({ salesTax: e.target.value })}
                  className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Card terminal</span>
              <Select
                value={values.cardTerminal}
                onChange={(v) => patch({ cardTerminal: v })}
                options={["Front desk terminal · connected", "Mobile reader · connected"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Late cancellation fee</span>
              <input
                value={values.lateCancelFee}
                onChange={(e) => patch({ lateCancelFee: e.target.value })}
                className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
            </label>
          </Card>

          <Card className="px-[22px] py-5">
            <h5 className="mb-1 text-[15.5px] font-semibold">Receipts &amp; billing</h5>
            {(
              [
                { key: "emailReceipt", label: "Email receipts", hint: "Sent to the member as soon as a sale is charged" },
                { key: "autoCharge", label: "Auto-charge memberships", hint: "Recurring plans bill on their renewal date" },
                { key: "packageAlert", label: "Flag unpaid sessions", hint: "Shows a balance-due badge on the session panel" },
                { key: "dailySummary", label: "Print end-of-day till report", hint: "Prints automatically when the till is closed" },
              ] as const
            ).map((t) => (
              <div key={t.key} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px]">{t.label}</div>
                  <div className="text-pretty text-xs text-muted">{t.hint}</div>
                </div>
                <Toggle on={values.paymentsFlags[t.key]} onClick={() => patchPaymentsFlag(t.key)} label={t.label} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "Notifications" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-[18px]">
          <Card className="px-[22px] py-5">
            <h5 className="mb-1 text-[15.5px] font-semibold">Member notifications</h5>
            {(
              [
                { key: "reminder", label: "Session reminders", hint: "Text and email before each booked session" },
                { key: "cancelNotice", label: "Cancellation confirmations", hint: "Confirms cancellations and refund method" },
                { key: "waitlistOpen", label: "Waitlist openings", hint: "Notifies the next member when a spot opens" },
                { key: "birthday", label: "Birthday messages", hint: "Sends a note on the member's birthday" },
                { key: "marketing", label: "Promotions and campaigns", hint: "Marketing email to members who opted in" },
              ] as const
            ).map((t) => (
              <div key={t.key} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px]">{t.label}</div>
                  <div className="text-pretty text-xs text-muted">{t.hint}</div>
                </div>
                <Toggle on={values.notifyFlags[t.key]} onClick={() => patchNotifyFlag(t.key)} label={t.label} />
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-3.5 px-[22px] py-5">
            <h5 className="text-[15.5px] font-semibold">Reminder timing</h5>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Session reminder</span>
              <Select
                value={values.reminderTiming}
                onChange={(v) => patch({ reminderTiming: v })}
                options={["24 hours before", "12 hours before", "2 hours before"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Package low warning</span>
              <Select
                value={values.packageWarning}
                onChange={(v) => patch({ packageWarning: v })}
                options={["2 sessions left", "3 sessions left", "5 sessions left"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Daily summary to</span>
              <input
                value={values.dailySummaryTo}
                onChange={(e) => patch({ dailySummaryTo: e.target.value })}
                className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
            </label>
          </Card>
        </div>
      )}
    </div>
  );
}
