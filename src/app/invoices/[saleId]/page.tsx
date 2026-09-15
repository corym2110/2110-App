import Link from "next/link";
import { getInvoice } from "@/server/sales";
import { getBusinessSettings } from "@/server/settings";
import { money, formatDateLong } from "@/lib/time";
import { PrintButton, InvoiceNotes } from "@/components/invoices/InvoiceActions";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const [invoice, settings] = await Promise.all([getInvoice(saleId), getBusinessSettings()]);

  if (!invoice) {
    return (
      <div className="mx-auto max-w-[640px] px-5 py-16 text-center text-[13.5px] text-muted">
        Invoice not found — it may have been merged into another member&apos;s record or removed.
      </div>
    );
  }

  const invoiceNumber = invoice.id.slice(-8).toUpperCase();
  const lines = invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems : [{ description: invoice.summary, amount: invoice.total }];

  return (
    <div className="min-h-screen bg-bg px-5 py-10 text-fg print:bg-white print:px-0 print:py-0 print:text-black">
      {/* Printing (Save as PDF included) should always look like a light, ink-friendly document,
          regardless of whoever's dark/light theme preference is currently active on screen. */}
      <style>{`
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
      <div className="mx-auto flex max-w-[680px] flex-col gap-5">
        <div className="print:hidden flex items-center justify-between gap-3">
          {invoice.member ? (
            <Link href={`/members/${invoice.member.id}`} className="text-[13.5px] text-muted hover:text-fg">
              ← Back to {invoice.member.name}
            </Link>
          ) : (
            <span />
          )}
          <PrintButton />
        </div>

        <div className="rounded-2xl border border-divider bg-surface px-8 py-9 print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-divider pb-6">
            <div>
              <div className="text-[20px] font-semibold tracking-tight">{settings.businessName}</div>
              <div className="mt-1 text-[13px] text-pretty text-muted">{settings.address}</div>
              <div className="text-[13px] text-muted">{settings.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-[26px] font-semibold tracking-tight">Invoice</div>
              <div className="mt-1 text-[12.5px] tabular-nums text-muted">#{invoiceNumber}</div>
              <div className="text-[12.5px] tabular-nums text-muted">{formatDateLong(new Date(invoice.createdAt))}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-[11px] tracking-wider text-muted uppercase">Billed to</div>
              {invoice.member ? (
                <>
                  <div className="mt-1 text-[14.5px] font-medium">{invoice.member.name}</div>
                  <div className="text-[13px] text-muted">{invoice.member.email}</div>
                  <div className="text-[13px] text-muted">{invoice.member.phone}</div>
                  {(invoice.member.address || invoice.member.city) && (
                    <div className="text-[13px] text-pretty text-muted">
                      {[invoice.member.address, invoice.member.city, invoice.member.province, invoice.member.postalCode].filter(Boolean).join(", ")}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-1 text-[14.5px]">Walk-in</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] tracking-wider text-muted uppercase">Status</div>
              <div className={`mt-1 inline-block rounded-full px-3 py-1 text-[12.5px] font-semibold ${invoice.paid ? "bg-ok/15 text-ok" : "bg-bad/10 text-bad"}`}>
                {invoice.paid ? "Paid" : "Unpaid — due"}
              </div>
              {invoice.coach && <div className="mt-2 text-[12.5px] text-muted">Coach: {invoice.coach.name}</div>}
            </div>
          </div>

          <div className="mt-7">
            <div className="grid grid-cols-[1fr_120px] gap-3 border-b border-divider pb-2 text-[11px] tracking-wider text-muted uppercase">
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>
            {lines.map((li, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px] gap-3 border-b border-divider py-3 text-[13.5px] last:border-b-0">
                <span className="text-pretty">{li.description}</span>
                <span className="text-right tabular-nums">{money(li.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-end gap-4 pt-4">
              <span className="text-[14.5px] font-semibold">Total due</span>
              <span className="text-[19px] font-semibold tabular-nums">{money(invoice.total)}</span>
            </div>
          </div>

          <div className="mt-7 border-t border-divider pt-5">
            <InvoiceNotes saleId={invoice.id} initialNotes={invoice.notes} />
          </div>

          <div className="mt-7 border-t border-divider pt-4 text-[12px] text-muted">
            Payment method on file: {invoice.method}. Questions about this invoice? Contact {settings.businessName} at {settings.phone}.
          </div>
        </div>
      </div>
    </div>
  );
}
