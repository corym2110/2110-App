import Link from "next/link";
import { getCurrentCoach } from "@/server/coaches";
import { getRealReportsSummary, type ReportRangeKey } from "@/server/sales";
import { getBusinessSettings } from "@/server/settings";
import { getMembers } from "@/server/members";
import { canViewFinancials } from "@/lib/roles";
import { moneyRounded, money, formatDateLong } from "@/lib/time";
import { PrintButton } from "@/components/invoices/InvoiceActions";

export const dynamic = "force-dynamic";

const RANGES: ReportRangeKey[] = ["This week", "This month", "Last 90 days", "Year to date"];
const RANGE_LABEL: Record<ReportRangeKey, string> = {
  "This week": "Since Monday",
  "This month": "Month to date",
  "Last 90 days": "Last 90 days",
  "Year to date": "Since January 1",
};

export default async function ReportsPrintPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range: ReportRangeKey = RANGES.includes(rangeParam as ReportRangeKey) ? (rangeParam as ReportRangeKey) : "This week";

  const coach = await getCurrentCoach();
  if (!coach) {
    return <div className="px-5 py-16 text-center text-[13.5px] text-muted">You need a linked coach account to view this report.</div>;
  }
  const canSeeAll = canViewFinancials(coach.role);

  const [summary, settings, members] = await Promise.all([
    getRealReportsSummary(range, canSeeAll ? undefined : coach.id),
    getBusinessSettings(),
    getMembers(),
  ]);

  const followUp = members
    .filter((m) => m.balance > 0 && (canSeeAll || m.coach === coach.name))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10);

  const maxMethod = Math.max(1, ...summary.paymentMethods.map((m) => m.total));

  return (
    <div className="min-h-screen bg-bg px-5 py-10 text-fg print:bg-white print:px-0 print:py-0 print:text-black">
      {/* Same reasoning as the invoice page: printing should always be a clean, real-paper-width
          document, not the on-screen wide layout, regardless of theme or browser window size. */}
      <style>{`
        @page {
          size: letter;
          margin: 0.65in;
        }
        @media print {
          html[data-theme="dark"] {
            --app-bg: #f4f3ef;
            --app-surface: #ffffff;
            --app-text: #1c1e1c;
            --app-muted: #6d7270;
            --app-divider: rgba(28, 30, 28, .16);
            --app-row: rgba(28, 30, 28, .045);
            --app-ok: #0f6e6b;
            --app-accent: #0f6e6b;
          }
        }
      `}</style>

      <div className="mx-auto flex max-w-[760px] flex-col gap-5 print:max-w-[6.5in]">
        <div className="print:hidden flex items-center justify-between gap-3">
          <Link href="/reports" className="text-[13.5px] text-muted hover:text-fg">
            ← Back to Reports
          </Link>
          <PrintButton />
        </div>

        <div className="rounded-2xl border border-divider bg-surface px-8 py-9 print:border-0 print:px-0 print:py-9 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-divider pb-6">
            <div>
              <div className="text-[20px] font-semibold tracking-tight">{settings.businessName}</div>
              <div className="mt-1 text-[13px] text-pretty text-muted">{settings.address}</div>
              <div className="text-[13px] text-muted">{settings.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-[26px] font-semibold tracking-tight">{canSeeAll ? "Business report" : "My revenue"}</div>
              <div className="mt-1 text-[12.5px] text-muted">{RANGE_LABEL[range]}</div>
              <div className="text-[12.5px] tabular-nums text-muted">Generated {formatDateLong(new Date())}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] tracking-wider text-muted uppercase">Revenue</div>
              <div className="mt-1 text-[24px] font-semibold tabular-nums">{moneyRounded(summary.revenue)}</div>
              <div className="text-[12px] text-muted">{summary.saleCount} paid sale{summary.saleCount === 1 ? "" : "s"}</div>
            </div>
            <div>
              <div className="text-[11px] tracking-wider text-muted uppercase">New members</div>
              <div className="mt-1 text-[24px] font-semibold tabular-nums">{summary.newMembers}</div>
              <div className="text-[12px] text-muted">joined in this range</div>
            </div>
            <div>
              <div className="text-[11px] tracking-wider text-muted uppercase">Outstanding balance</div>
              <div className={`mt-1 text-[24px] font-semibold tabular-nums ${summary.outstandingBalance > 0 ? "text-bad" : ""}`}>
                {moneyRounded(summary.outstandingBalance)}
              </div>
              <div className="text-[12px] text-muted">right now</div>
            </div>
          </div>

          <div className="mt-7 border-t border-divider pt-5">
            <div className="mb-3 flex items-baseline justify-between gap-3.5">
              <h5 className="text-[14.5px] font-semibold">Revenue by payment method</h5>
              <span className="text-[12px] text-muted">{moneyRounded(summary.revenue)} total</span>
            </div>
            {summary.paymentMethods.length === 0 && <div className="py-3 text-[13px] text-muted">No sales recorded in this range.</div>}
            <div className="flex flex-col gap-2.5">
              {summary.paymentMethods.map((m) => (
                <div key={m.method} className="min-w-0">
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px]">{m.method}</span>
                    <span className="flex-none text-[12px] tabular-nums text-muted">
                      {moneyRounded(m.total)} · {m.count} sale{m.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-row">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, Math.round((m.total / maxMethod) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 border-t border-divider pt-5">
            <h5 className="mb-3 text-[14.5px] font-semibold">Top sellers</h5>
            {summary.topSellers.length === 0 && <div className="py-3 text-[13px] text-muted">Nothing sold in this range.</div>}
            {summary.topSellers.map((s) => (
              <div key={s.summary} className="flex items-center gap-3.5 border-b border-divider py-2 text-[13px] last:border-b-0">
                <span className="min-w-0 flex-1 truncate">{s.summary}</span>
                <span className="w-14 flex-none text-right text-muted tabular-nums">{s.count} sold</span>
                <span className="w-[82px] flex-none text-right font-medium tabular-nums">{moneyRounded(s.total)}</span>
              </div>
            ))}
          </div>

          {canSeeAll && (
            <div className="mt-7 border-t border-divider pt-5">
              <h5 className="mb-3 text-[14.5px] font-semibold">Coach revenue</h5>
              {summary.coachShare.length === 0 && <div className="py-3 text-[13px] text-muted">No coach-attributed sales yet.</div>}
              {summary.coachShare.map((c) => (
                <div key={c.coachId} className="flex items-center gap-3.5 border-b border-divider py-2 text-[13px] last:border-b-0">
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="text-right font-medium tabular-nums">{moneyRounded(c.total)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-7 border-t border-divider pt-5">
            <h5 className="mb-3 text-[14.5px] font-semibold">Needs follow-up (balance due)</h5>
            {followUp.length === 0 && <div className="py-3 text-[13px] text-muted">Nobody has an outstanding balance right now.</div>}
            {followUp.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 border-b border-divider py-2 text-[13px] last:border-b-0">
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <span className="flex-none text-bad">{money(m.balance)} due</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
