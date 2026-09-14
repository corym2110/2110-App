"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { PlusIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { useHeaderAction } from "@/lib/useHeaderAction";
import { useCoachesWithRefetch } from "@/lib/useCoaches";
import { AddCoachDialog } from "@/components/settings/AddCoachDialog";
import { initialsOf } from "@/lib/time";
import { SESSION_TYPES } from "@/data/mock/sessionTypes";

type Tab = "Facility" | "Staff" | "Services" | "Payments" | "Notifications";

const TAB_LABELS: Record<Tab, string> = {
  Facility: "Business details, hours and booking rules",
  Staff: "Coaches, roles and access",
  Services: "Session types, lengths and pricing",
  Payments: "Tax, terminals and receipts",
  Notifications: "Member reminders and internal alerts",
};

function useToggleGroup(initial: Record<string, boolean>) {
  const [flags, setFlags] = useState(initial);
  const toggle = (key: string) => setFlags((f) => ({ ...f, [key]: !f[key] }));
  return { flags, toggle };
}

export function SettingsClient() {
  const [tab, setTab] = useState<Tab>("Facility");
  const [saved, setSaved] = useState(false);
  const booking = useToggleGroup({ selfBook: true, waitlist: true, requireCard: false, allowDouble: false });
  const payments = useToggleGroup({ emailReceipt: true, autoCharge: true, packageAlert: true, dailySummary: false });
  const notify = useToggleGroup({ reminder: true, cancelNotice: true, waitlistOpen: true, birthday: false, marketing: false });
  const [timezone, setTimezone] = useState("Mountain (MDT)");
  const [bookingIncrement, setBookingIncrement] = useState("15 minutes");
  const [calendarView, setCalendarView] = useState("Week");
  const [currency, setCurrency] = useState("CAD");
  const [cardTerminal, setCardTerminal] = useState("Front desk terminal · connected");
  const [reminderTiming, setReminderTiming] = useState("24 hours before");
  const [packageWarning, setPackageWarning] = useState("2 sessions left");
  const { coaches, refetch: refetchCoaches } = useCoachesWithRefetch();
  const [addCoachOpen, setAddCoachOpen] = useState(false);

  useHeaderAction(<HeaderButton onClick={() => setSaved(true)}>{saved ? "Saved" : "Save changes"}</HeaderButton>);

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
              <input defaultValue="2110 Fitness" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Address</span>
              <input defaultValue="5824 Burbank Rd SE, Calgary, AB" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Phone</span>
                <input defaultValue="+1 403 555 2110" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Time zone</span>
                <Select
                  value={timezone}
                  onChange={setTimezone}
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
                <input defaultValue="6:00 AM" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Closes</span>
                <input defaultValue="8:00 PM" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Booking increment</span>
              <Select
                value={bookingIncrement}
                onChange={setBookingIncrement}
                options={["5 minutes", "10 minutes", "15 minutes", "30 minutes"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Default calendar view</span>
              <Select
                value={calendarView}
                onChange={setCalendarView}
                options={["Week", "Day", "Month"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
          </Card>

          <Card className="px-[22px] py-5">
            <h5 className="mb-1 text-[15.5px] font-semibold">Booking rules</h5>
            {[
              { key: "selfBook", label: "Members can self-book", hint: "Booking opens 14 days ahead in the member app" },
              { key: "waitlist", label: "Waitlists on full sessions", hint: "Members are promoted automatically when a spot frees up" },
              { key: "requireCard", label: "Require card on file", hint: "Members must save a card before booking" },
              { key: "allowDouble", label: "Allow double-booked slots", hint: "Lets two sessions share the same time in one coach's column" },
            ].map((t) => (
              <div key={t.key} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px]">{t.label}</div>
                  <div className="text-pretty text-xs text-muted">{t.hint}</div>
                </div>
                <Toggle on={booking.flags[t.key]} onClick={() => booking.toggle(t.key)} label={t.label} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "Staff" && (
        <Card className="overflow-hidden py-1.5">
          <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_96px] gap-3.5 border-b border-divider px-[22px] py-3 text-[11px] tracking-wider text-muted uppercase">
            <span>Staff</span>
            <span>Role</span>
            <span className="text-right">Status</span>
          </div>
          {coaches.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_96px] items-center gap-3.5 border-b border-divider px-[22px] py-3.5 last:border-b-0">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-row text-[11.5px] font-semibold text-muted">{initialsOf(c.name)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{c.email}</span>
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
                <span className="truncate">{c.role}</span>
                {c.isAdmin && <span className="flex-none rounded-full bg-accent/15 px-2 py-0.5 text-[10.5px] font-semibold text-accent">Admin</span>}
              </span>
              <span className={`rounded-md py-0.5 text-right text-[11.5px] ${c.active ? "bg-ok/15 text-ok" : "bg-row text-muted"}`}>
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
          {SESSION_TYPES.map((t) => (
            <div key={t.name} className="grid grid-cols-[minmax(0,1.5fr)_108px_116px_minmax(0,1fr)] items-center gap-3.5 border-b border-divider px-[22px] py-3.5 last:border-b-0">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-2.5 w-2.5 flex-none rounded-[3px] bg-accent" />
                <span className="min-w-0 truncate text-sm">{t.name}</span>
              </span>
              <span className="text-right text-[13.5px] tabular-nums">{t.duration} min</span>
              <span className="text-right text-[13.5px] font-medium tabular-nums">{t.price ? `$${t.price.toFixed(2)}` : "No charge"}</span>
              <span className="text-[13.5px] text-muted">{t.capacity ? `Up to ${t.capacity}` : "1 client"}</span>
            </div>
          ))}
          <div className="px-[22px] py-3.5">
            <button type="button" className="flex h-9 items-center gap-1.5 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
              <PlusIcon size={14} />
              Add session type
            </button>
          </div>
        </Card>
      )}

      {tab === "Payments" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-[18px]">
          <Card className="flex flex-col gap-3.5 px-[22px] py-5">
            <h5 className="text-[15.5px] font-semibold">Payments</h5>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Currency</span>
                <Select
                  value={currency}
                  onChange={setCurrency}
                  options={["CAD", "USD"].map((v) => ({ value: v, label: v }))}
                  className="h-[38px] rounded-lg px-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] tracking-wider text-muted uppercase">Sales tax</span>
                <input defaultValue="GST 5%" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Card terminal</span>
              <Select
                value={cardTerminal}
                onChange={setCardTerminal}
                options={["Front desk terminal · connected", "Mobile reader · connected"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Late cancellation fee</span>
              <input defaultValue="$25.00" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
            </label>
          </Card>

          <Card className="px-[22px] py-5">
            <h5 className="mb-1 text-[15.5px] font-semibold">Receipts &amp; billing</h5>
            {[
              { key: "emailReceipt", label: "Email receipts", hint: "Sent to the member as soon as a sale is charged" },
              { key: "autoCharge", label: "Auto-charge memberships", hint: "Recurring plans bill on their renewal date" },
              { key: "packageAlert", label: "Flag unpaid sessions", hint: "Shows a balance-due badge on the session panel" },
              { key: "dailySummary", label: "Print end-of-day till report", hint: "Prints automatically when the till is closed" },
            ].map((t) => (
              <div key={t.key} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px]">{t.label}</div>
                  <div className="text-pretty text-xs text-muted">{t.hint}</div>
                </div>
                <Toggle on={payments.flags[t.key]} onClick={() => payments.toggle(t.key)} label={t.label} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "Notifications" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-start gap-[18px]">
          <Card className="px-[22px] py-5">
            <h5 className="mb-1 text-[15.5px] font-semibold">Member notifications</h5>
            {[
              { key: "reminder", label: "Session reminders", hint: "Text and email before each booked session" },
              { key: "cancelNotice", label: "Cancellation confirmations", hint: "Confirms cancellations and refund method" },
              { key: "waitlistOpen", label: "Waitlist openings", hint: "Notifies the next member when a spot opens" },
              { key: "birthday", label: "Birthday messages", hint: "Sends a note on the member's birthday" },
              { key: "marketing", label: "Promotions and campaigns", hint: "Marketing email to members who opted in" },
            ].map((t) => (
              <div key={t.key} className="flex items-center gap-3.5 border-b border-divider py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px]">{t.label}</div>
                  <div className="text-pretty text-xs text-muted">{t.hint}</div>
                </div>
                <Toggle on={notify.flags[t.key]} onClick={() => notify.toggle(t.key)} label={t.label} />
              </div>
            ))}
          </Card>

          <Card className="flex flex-col gap-3.5 px-[22px] py-5">
            <h5 className="text-[15.5px] font-semibold">Reminder timing</h5>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Session reminder</span>
              <Select
                value={reminderTiming}
                onChange={setReminderTiming}
                options={["24 hours before", "12 hours before", "2 hours before"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Package low warning</span>
              <Select
                value={packageWarning}
                onChange={setPackageWarning}
                options={["2 sessions left", "3 sessions left", "5 sessions left"].map((v) => ({ value: v, label: v }))}
                className="h-[38px] rounded-lg px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Daily summary to</span>
              <input defaultValue="cory@2110fitness.com" className="h-[38px] rounded-lg border border-divider bg-transparent px-2.5 text-sm" />
            </label>
          </Card>
        </div>
      )}
    </div>
  );
}
