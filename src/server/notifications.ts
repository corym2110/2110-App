"use server";

import { revalidatePath } from "next/cache";
import { db } from "./db";
import { getBusinessSettings } from "./settings";
import { clock, formatDateShort } from "@/lib/time";

export interface NotificationRow {
  id: string;
  type: string;
  text: string;
  memberId: string | null;
  read: boolean;
  createdAt: string;
}

function toRow(row: { id: string; type: string; text: string; memberId: string | null; read: boolean; createdAt: Date }): NotificationRow {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function getNotificationsForCoach(coachId: string): Promise<NotificationRow[]> {
  const rows = await db.notification.findMany({
    where: { coachId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map(toRow);
}

export async function markNotificationRead(id: string): Promise<void> {
  await db.notification.update({ where: { id }, data: { read: true } }).catch(() => {});
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(coachId: string): Promise<void> {
  await db.notification.updateMany({ where: { coachId, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}

async function memberIdByName(name: string): Promise<string | null> {
  const parts = name.trim().split(/\s+/);
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(" ");
  const member = await db.member.findFirst({ where: { firstName, lastName } });
  return member?.id ?? null;
}

function when(iso: string, start: number): string {
  return `${formatDateShort(new Date(`${iso}T00:00:00`))} · ${clock(start)}`;
}

/** Every notifyX() below is best-effort: notifications are supplementary, so a lookup miss
    or bad flag shape must never throw back into the real booking/cancel/join action that
    triggered it. */
async function safely(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // supplementary — swallow
  }
}

export async function notifyManualBooking(coachId: string, memberName: string, iso: string, start: number): Promise<void> {
  await safely(async () => {
    const coach = await db.coach.findUnique({ where: { id: coachId }, select: { notifyFlags: true } });
    const flags = coach?.notifyFlags as { manualBooking?: boolean } | null;
    if (!flags?.manualBooking) return;
    const memberId = await memberIdByName(memberName);
    await db.notification.create({
      data: { type: "booking", text: `New booking: ${memberName} · ${when(iso, start)}`, memberId, coachId },
    });
  });
}

export async function notifyClassJoin(coachId: string, memberName: string, iso: string, start: number): Promise<void> {
  await safely(async () => {
    const coach = await db.coach.findUnique({ where: { id: coachId }, select: { notifyFlags: true } });
    const flags = coach?.notifyFlags as { classJoin?: boolean } | null;
    if (!flags?.classJoin) return;
    const memberId = await memberIdByName(memberName);
    await db.notification.create({
      data: { type: "classJoin", text: `${memberName} joined the ${when(iso, start)} class`, memberId, coachId },
    });
  });
}

export async function notifyCancellation(coachId: string, memberName: string, iso: string, start: number): Promise<void> {
  await safely(async () => {
    const settings = await getBusinessSettings();
    if (!settings.notifyFlags.cancelNotice) return;
    const memberId = await memberIdByName(memberName);
    await db.notification.create({
      data: { type: "cancelled", text: `Cancelled: ${memberName}'s ${when(iso, start)} session`, memberId, coachId },
    });
  });
}

export async function notifyWaitlistOpen(coachId: string, iso: string, start: number, waitlistCount: number): Promise<void> {
  await safely(async () => {
    const settings = await getBusinessSettings();
    if (!settings.notifyFlags.waitlistOpen) return;
    await db.notification.create({
      data: {
        type: "waitlistOpen",
        text: `Waitlist open: 1 spot in the ${when(iso, start)} session (${waitlistCount} waiting)`,
        coachId,
      },
    });
  });
}
