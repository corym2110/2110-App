"use client";

import { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { XIcon } from "@/components/ui/icons";
import { TrendSparkline } from "@/components/members/TrendSparkline";
import { LogBodPodScanDialog } from "@/components/members/LogBodPodScanDialog";
import { getBodPodResultsForMember, deleteBodPodResult, type BodPodResultRow } from "@/server/bodpod";
import { formatDateShort } from "@/lib/time";
import type { Member } from "@/types";

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}
function fmtLb(v: number): string {
  return `${v.toFixed(1)} lb`;
}

/** Delta vs. the previous scan — shown as a plain directional arrow, not colored good/bad. Whether
    a rise or fall in weight/body fat is "good" depends entirely on the client's own goal (cutting
    vs. bulking), so this stays a neutral fact, not a judgment call the app has no basis to make. */
function Delta({ prev, cur, fmt }: { prev: number | undefined; cur: number; fmt: (v: number) => string }) {
  if (prev === undefined) return <span className="text-muted">—</span>;
  const diff = cur - prev;
  if (Math.abs(diff) < 0.05) return <span className="text-muted">no change</span>;
  return (
    <span className="text-muted">
      {diff > 0 ? "↑" : "↓"} {fmt(Math.abs(diff))}
    </span>
  );
}

function toCsv(rows: BodPodResultRow[]): string {
  const header = ["Date", "Body Mass (lb)", "Fat Mass (lb)", "Fat Free Mass (lb)", "% Fat", "% Fat Free Mass", "RMR (kcal/day)", "Notes"];
  const lines = rows.map((r) =>
    [
      r.scanIso,
      r.bodyMassLbs.toFixed(2),
      r.fatMassLbs.toFixed(2),
      r.fatFreeMassLbs.toFixed(2),
      r.bodyFatPct.toFixed(1),
      (100 - r.bodyFatPct).toFixed(1),
      r.rmrKcal != null ? r.rmrKcal.toFixed(0) : "",
      r.notes ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function BodPodCard({ member }: { member: Member }) {
  const [results, setResults] = useState<BodPodResultRow[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();

  function refetch() {
    getBodPodResultsForMember(member.id).then(setResults);
  }
  useEffect(refetch, [member.id]);

  function exportCsv() {
    const blob = new Blob([toCsv(results)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${member.name.replace(/\s+/g, "-")}-bodpod-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const newestFirst = [...results].reverse();

  return (
    <Card className="px-[22px] py-5">
      <div className="mb-3 flex items-baseline justify-between gap-2.5">
        <h5 className="text-[15.5px] font-semibold">Body composition</h5>
        <div className="flex items-center gap-3">
          {results.length > 0 && (
            <button type="button" onClick={exportCsv} className="text-[12.5px] text-muted hover:text-fg">
              Export CSV
            </button>
          )}
          <button type="button" onClick={() => setLogOpen(true)} className="text-[12.5px] text-link hover:text-link-hover">
            Log scan
          </button>
        </div>
      </div>

      {results.length === 0 && <div className="py-4 text-center text-[13.5px] text-muted">No scans logged yet.</div>}

      {results.length > 0 && (
        <>
          <div className="mb-1 text-[11.5px] tracking-wider text-muted uppercase">% Fat trend</div>
          <TrendSparkline points={results.map((r) => ({ iso: r.scanIso, value: r.bodyFatPct }))} formatValue={fmtPct} />

          <div className="mt-4 border-t border-divider pt-3">
            {newestFirst.map((r, i) => {
              const prev = newestFirst[i + 1];
              return (
                <div key={r.id} className="group flex items-center gap-3 border-b border-divider py-2.5 text-[12.5px] last:border-b-0">
                  <span className="w-[84px] flex-none tabular-nums text-muted">{formatDateShort(new Date(`${r.scanIso}T00:00:00`))}</span>
                  <span className="w-[72px] flex-none tabular-nums">{fmtLb(r.bodyMassLbs)}</span>
                  <span className="w-[76px] flex-none tabular-nums text-muted">{fmtPct(r.bodyFatPct)}</span>
                  <span className="w-[80px] flex-none tabular-nums text-muted">{fmtLb(r.fatFreeMassLbs)} FFM</span>
                  {r.rmrKcal != null && <span className="w-[92px] flex-none tabular-nums text-muted">{r.rmrKcal.toFixed(0)} kcal</span>}
                  <span className="min-w-0 flex-1 text-right tabular-nums">
                    <Delta prev={prev?.bodyFatPct} cur={r.bodyFatPct} fmt={fmtPct} />
                  </span>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => startDeleting(async () => { await deleteBodPodResult(r.id, member.id); refetch(); })}
                    title="Delete this entry"
                    className="grid h-6 w-6 flex-none place-items-center rounded-md text-muted opacity-0 hover:bg-row hover:text-bad group-hover:opacity-100"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {logOpen && <LogBodPodScanDialog member={member} onClose={() => setLogOpen(false)} onLogged={refetch} />}
    </Card>
  );
}
