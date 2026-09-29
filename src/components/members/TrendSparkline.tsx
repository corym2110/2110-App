"use client";

import type { CSSProperties } from "react";
import { MONTHS } from "@/lib/time";

/** A small hand-rolled line chart with real axes — no charting library, matching the rest of the
    app's minimal, hand-rolled visuals (e.g. the Reports page's width-percentage bars). The SVG
    plot uses a fixed 0-100 coordinate space scaled to its container via `preserveAspectRatio="none"`;
    axis labels are plain HTML positioned alongside/under it rather than SVG `<text>`, since SVG
    text would stretch unreadably under that same non-uniform scaling. */

const MAX_X_LABELS = 6;

function shortDate(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1].slice(0, 3)} '${y.slice(2)}`;
}

export function TrendSparkline({
  points,
  height = 96,
  formatValue = (v: number) => String(v),
}: {
  points: { iso: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const mid = (min + max) / 2;

  function xOf(i: number): number {
    return points.length === 1 ? 50 : (i / (points.length - 1)) * 100;
  }
  function yOf(v: number): number {
    return height - ((v - min) / span) * height;
  }

  const linePoints = points.map((p, i) => `${xOf(i)},${yOf(p.value)}`).join(" ");

  // Thin out x-axis labels so they don't collide when there are many points — always keep the
  // first and last, evenly sample the rest.
  const labelStep = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  const labeledIndices = new Set<number>();
  for (let i = 0; i < points.length; i += labelStep) labeledIndices.add(i);
  labeledIndices.add(points.length - 1);

  return (
    <div className="flex gap-2.5">
      <div className="flex flex-none flex-col justify-between text-[10.5px] text-muted" style={{ height }}>
        <span>{formatValue(max)}</span>
        {points.length > 2 && <span>{formatValue(mid)}</span>}
        <span>{formatValue(min)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-accent" style={{ height }}>
          <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <line x1="0" y1={0} x2="100" y2={0} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={height} x2="100" y2={height} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {points.map((p, i) => (
              <circle key={p.iso} cx={xOf(i)} cy={yOf(p.value)} r={i === points.length - 1 ? 2.5 : 1.75} fill="currentColor">
                <title>
                  {shortDate(p.iso)} — {formatValue(p.value)}
                </title>
              </circle>
            ))}
          </svg>
        </div>
        <div className="relative mt-1 h-4">
          {points.map((p, i) => {
            if (!labeledIndices.has(i)) return null;
            // Inline `style` always wins over a CSS class, so the first/last label's edge-anchoring
            // (instead of center-anchoring, which would run off the container) has to be computed
            // here rather than via a Tailwind `first:`/`last:` variant.
            const style: CSSProperties =
              i === 0 ? { left: 0 } : i === points.length - 1 ? { right: 0 } : { left: `${xOf(i)}%`, transform: "translateX(-50%)" };
            return (
              <span key={p.iso} className="absolute top-0 text-[10.5px] whitespace-nowrap text-muted" style={style}>
                {shortDate(p.iso)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
