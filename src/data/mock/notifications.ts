import type { NotificationItem } from "@/types";

// Shared across every screen's notification bell, ported from each .dc.html's notifData().
export const NOTIFICATIONS: NotificationItem[] = [
  { id: "b1", text: "Sarah Chen booked Personal Training", when: "Today, 10:00 AM · booked 6 min ago", initials: "SC", memberName: "Sarah Chen" },
  { id: "b2", text: "Owen Pratt joined Conditioning", when: "Today, 4:30 PM class · 14 min ago", initials: "OP", memberName: "Owen Pratt" },
  { id: "b3", text: "Kim Alvarez joined Group Training", when: "Today, 11:35 AM · 38 min ago", initials: "KA", memberName: "Kim Alvarez" },
  { id: "b4", text: "Rafael Diaz booked Bodpod", when: "Thu, Sep 3, 2:20 PM · 1 hr ago", initials: "RD", memberName: "Rafael Diaz" },
  { id: "b5", text: "Amy Cole joined Recovery class", when: "Sun, Sep 6, 10:00 AM · 2 hrs ago", initials: "AC", memberName: "Amy Cole" },
];
