"use client";

import type { CoachAvailability, CoachId } from "@/types";
import type { Occurrence } from "@/server/schedule";
import { layoutLanes } from "@/lib/layoutLanes";
import { offReason } from "@/lib/availability";
import { clock } from "@/lib/time";
import { sessionTypeColor, capacityOf, shortLabel } from "@/data/mock/sessionTypes";

export const DAY_START = 360;
export const DAY_END = 1200;
export const SLOT_PX = 6;
export const COLUMN_HEIGHT = ((DAY_END - DAY_START) / 5) * SLOT_PX;

export interface DragPayload {
  key: string;
  iso: string;
  start: number;
  duration: number;
  coach: CoachId;
  type: string;
}

function topFor(start: number): number {
  return ((start - DAY_START) / 5) * SLOT_PX;
}
function heightFor(duration: number): number {
  return Math.max((duration / 5) * SLOT_PX, 16);
}
function minuteFromClientY(clientY: number, top: number): number {
  const raw = DAY_START + Math.round((clientY - top) / SLOT_PX) * 5;
  return Math.max(DAY_START, Math.min(DAY_END - 15, raw));
}

export function DayColumn({
  date,
  occurrences,
  selectedKey,
  onSelect,
  onSlotClick,
  availability,
  relevantCoachIds,
  dark,
  onDragStartOccurrence,
  onDrop,
  showNowLine,
  nowMin,
}: {
  date: Date;
  occurrences: Occurrence[];
  selectedKey: string | null;
  onSelect: (o: Occurrence) => void;
  onSlotClick: (startMin: number) => void;
  availability: Record<string, CoachAvailability>;
  relevantCoachIds: CoachId[];
  dark: boolean;
  onDragStartOccurrence: (o: Occurrence) => void;
  onDrop: (startMin: number) => void;
  showNowLine: boolean;
  nowMin: number;
}) {
  const laned = layoutLanes(occurrences, (o) => o.start, (o) => o.start + o.duration);

  // Closed bands: every relevant coach off at that 5-min tick.
  const bands: { top: number; height: number; label: string }[] = [];
  {
    let bandStart: number | null = null;
    for (let m = DAY_START; m < DAY_END; m += 5) {
      const shut = relevantCoachIds.every((id) => !!offReason(availability[id], date, m, 5));
      if (shut && bandStart === null) bandStart = m;
      if (!shut && bandStart !== null) {
        bands.push({ top: topFor(bandStart), height: topFor(m) - topFor(bandStart), label: relevantCoachIds.length === 1 ? offReason(availability[relevantCoachIds[0]], date, bandStart, 5) ?? "" : "Closed" });
        bandStart = null;
      }
    }
    if (bandStart !== null) bands.push({ top: topFor(bandStart), height: topFor(DAY_END) - topFor(bandStart), label: relevantCoachIds.length === 1 ? offReason(availability[relevantCoachIds[0]], date, bandStart, 5) ?? "" : "Closed" });
  }

  return (
    <div
      className="relative cursor-copy border-l border-divider"
      style={{ height: COLUMN_HEIGHT, backgroundImage: "repeating-linear-gradient(to bottom, var(--app-divider) 0 1px, transparent 1px 72px)" }}
      onClick={(ev) => {
        const top = ev.currentTarget.getBoundingClientRect().top;
        onSlotClick(minuteFromClientY(ev.clientY, top));
      }}
      onDragOver={(ev) => ev.preventDefault()}
      onDrop={(ev) => {
        ev.preventDefault();
        const top = ev.currentTarget.getBoundingClientRect().top;
        onDrop(minuteFromClientY(ev.clientY, top));
      }}
    >
      {bands.map((b, i) => (
        <div key={i} className="pointer-events-none absolute inset-x-0 z-0" style={{ top: b.top, height: b.height, background: "repeating-linear-gradient(45deg, var(--app-row) 0 6px, transparent 6px 12px)" }}>
          {b.height >= 30 && <span className="absolute left-1.5 top-1 truncate text-[9px] tracking-wide text-muted uppercase">{b.label}</span>}
        </div>
      ))}

      {showNowLine && nowMin >= DAY_START && nowMin <= DAY_END && (
        <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-bad" style={{ top: topFor(nowMin) }}>
          <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-bad" />
        </div>
      )}

      {laned.map(({ item: o, lane, lanes }) => {
        const color = sessionTypeColor(o.type, dark);
        const height = heightFor(o.duration);
        const cap = capacityOf(o.type, o.name, o.capacity);
        const head = o.roster?.length ?? 0;
        const full = cap > 0 && head >= cap;
        const selected = selectedKey === o.key;
        const compact = height < 34;
        return (
          <div
            key={o.key}
            draggable
            onDragStart={() => onDragStartOccurrence(o)}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect(o);
            }}
            className={`absolute z-10 cursor-grab overflow-hidden rounded-md border-l-[3px] ${selected ? "ring-2 ring-accent" : ""}`}
            style={{
              top: topFor(o.start),
              height,
              left: `calc(${(lane * 100) / lanes}% + 1px)`,
              width: `calc(${100 / lanes}% - 2px)`,
              background: `${color}${dark ? "26" : "18"}`,
              borderLeftColor: color,
            }}
            title={`${o.name || "Group Training"} · ${clock(o.start)}–${clock(o.start + o.duration)}`}
          >
            <div className={`h-full ${compact ? "flex items-center justify-center px-1" : "px-1.5 py-1"}`}>
              {!compact && (
                <div className="truncate text-[11px] font-semibold" style={{ color }}>
                  {shortLabel(o.type)}
                </div>
              )}
              <div className={`truncate ${compact ? "text-[10px]" : "text-[11.5px]"}`}>
                {o.roster?.length ? `${o.name ? o.name + " · " : ""}${head}${o.type === "Class" ? " signed in" : " booked"}` : o.name}
              </div>
              {!compact && height >= 46 && <div className="truncate text-[10.5px] tabular-nums text-muted">{clock(o.start)}–{clock(o.start + o.duration)}</div>}
            </div>
            {full && height >= 22 && <span className="absolute bottom-0.5 right-0.5 rounded bg-bad px-1 text-[8px] font-bold tracking-wide text-white">FULL</span>}
          </div>
        );
      })}
    </div>
  );
}
