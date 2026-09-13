export interface Laned<T> {
  item: T;
  lane: number;
  lanes: number;
}

/** Greedy interval scheduling: assigns each event a lane so overlapping events sit side by side. */
export function layoutLanes<T>(events: T[], start: (e: T) => number, end: (e: T) => number): Laned<T>[] {
  const sorted = [...events].sort((a, b) => start(a) - start(b) || end(a) - end(b));
  const laneEnds: number[] = [];
  const placed: { item: T; lane: number }[] = [];

  for (const ev of sorted) {
    let lane = laneEnds.findIndex((e) => e <= start(ev));
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end(ev));
    } else {
      laneEnds[lane] = end(ev);
    }
    placed.push({ item: ev, lane });
  }

  // Determine, for each event, how many lanes are active during its span (for width sizing).
  return placed.map(({ item, lane }) => {
    const s = start(item);
    const e = end(item);
    const concurrent = placed.filter((p) => start(p.item) < e && end(p.item) > s);
    const lanes = Math.max(1, ...concurrent.map((p) => p.lane + 1));
    return { item, lane, lanes };
  });
}
