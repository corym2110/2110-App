"use client";

/** A small hand-rolled line chart — no charting library, matching the rest of the app's minimal,
    hand-rolled visuals (e.g. the Reports page's width-percentage bars). `viewBox` is a fixed
    0-100 coordinate space scaled to 100% width via CSS, so the chart resizes without distortion
    as long as `preserveAspectRatio="none"` and a fixed pixel `height` are both set. */
export function TrendSparkline({
  points,
  height = 72,
  formatValue = (v: number) => String(v),
}: {
  points: { iso: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (points.length === 0) return null;

  const padTop = 16;
  const padBottom = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  function xOf(i: number): number {
    return points.length === 1 ? 50 : (i / (points.length - 1)) * 100;
  }
  function yOf(v: number): number {
    return height - padBottom - ((v - min) / span) * (height - padTop - padBottom);
  }

  const linePoints = points.map((p, i) => `${xOf(i)},${yOf(p.value)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div className="text-accent">
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="overflow-visible">
        <line x1="0" y1={height - padBottom} x2="100" y2={height - padBottom} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={p.iso} cx={xOf(i)} cy={yOf(p.value)} r={i === points.length - 1 ? 2.5 : 1.75} fill="currentColor">
            <title>
              {p.iso} — {formatValue(p.value)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex items-baseline justify-between text-[11.5px] text-muted">
        <span>{formatValue(min)}</span>
        <span className="font-semibold text-fg">{formatValue(last.value)} latest</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}
