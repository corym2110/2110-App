"use client";

import type { CSSProperties } from "react";
import { MONTHS } from "@/lib/time";

/** A small hand-rolled line chart with real axes — no charting library, matching the rest of the
    app's minimal, hand-rolled visuals (e.g. the Reports page's width-percentage bars). The SVG
    plot uses a fixed 0-100 coordinate space scaled to its container via `preserveAspectRatio="none"`;
    axis labels are plain HTML positioned alongside/under it rather than SVG `<text>`, since SVG
    text would stretch unreadably under that same non-uniform scaling.

    Supports one or more series sharing the same x-axis (same iso dates) and one shared y-axis —
    a single series renders exactly as a plain trend line (no legend); 2+ series each get their
    own `colorClass` (a `text-*` Tailwind class, since the SVG strokes use `currentColor`) and a
    small legend row appears underneath. */

const MAX_X_LABELS = 6;

export interface TrendSeries {
  key: string;
  label: string;
  colorClass: string;
  values: { iso: string; value: number }[];
}

function shortDate(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1].slice(0, 3)} '${y.slice(2)}`;
}

export function TrendSparkline({
  series,
  height = 96,
  formatValue = (v: number) => String(v),
}: {
  series: TrendSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const points = series[0]?.values ?? [];
  if (series.length === 0 || points.length === 0) return null;

  const allValues = series.flatMap((s) => s.values.map((p) => p.value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;
  const mid = (min + max) / 2;

  function xOf(i: number): number {
    return points.length === 1 ? 50 : (i / (points.length - 1)) * 100;
  }
  function yOf(v: number): number {
    return height - ((v - min) / span) * height;
  }

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
        <div style={{ height }}>
          <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <line x1="0" y1={0} x2="100" y2={0} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} vectorEffect="non-scaling-stroke" className="text-muted" />
            <line x1="0" y1={height} x2="100" y2={height} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} vectorEffect="non-scaling-stroke" className="text-muted" />
            {series.map((s) => {
              const linePoints = s.values.map((p, i) => `${xOf(i)},${yOf(p.value)}`).join(" ");
              return (
                <g key={s.key} className={s.colorClass}>
                  <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  {s.values.map((p, i) => (
                    <circle key={p.iso} cx={xOf(i)} cy={yOf(p.value)} r={i === s.values.length - 1 ? 2.5 : 1.75} fill="currentColor">
                      <title>
                        {s.label} · {shortDate(p.iso)} — {formatValue(p.value)}
                      </title>
                    </circle>
                  ))}
                </g>
              );
            })}
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
        {series.length > 1 && (
          <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className={`h-[7px] w-[7px] flex-none rounded-full bg-current ${s.colorClass}`} />
                {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
