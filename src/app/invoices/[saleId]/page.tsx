import Link from "next/link";
import { getInvoice } from "@/server/sales";
import { getBusinessSettings } from "@/server/settings";
import { getSessionCreditsForSale } from "@/server/billing";
import { money, formatDateTime, formatDateShort, clock } from "@/lib/time";
import { PrintButton, InvoiceNotes, EmailConfirmationButton } from "@/components/invoices/InvoiceActions";

export const dynamic = "force-dynamic";

function signedMoney(n: number): string {
  return n < 0 ? `-${money(Math.abs(n))}` : money(n);
}

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

  const sessionCredits = await getSessionCreditsForSale(saleId);

  const invoiceNumber = invoice.id.slice(-8).toUpperCase();
  const lines = invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems : [{ description: invoice.summary, quantity: 1, unitPrice: invoice.total }];
  const subtotal = invoice.taxRate != null ? invoice.total / (1 + invoice.taxRate) : null;
  const tax = subtotal != null ? invoice.total - subtotal : null;

  const [wordmarkFirst, ...wordmarkRest] = settings.businessName.split(" ");

  return (
    <div className="min-h-screen bg-bg px-5 py-10 text-fg print:bg-white print:px-0 print:py-0 print:text-black">
      {/* Printing (Save as PDF included) should always look like a clean, ink-friendly document at a
          real paper width — not the on-screen app's card floating on a wide layout — regardless of
          the viewer's dark/light theme or how wide their browser window happens to be. */}
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
      <div className="mx-auto flex max-w-[560px] flex-col gap-5">
        <div className="print:hidden flex items-center justify-between gap-3">
          {invoice.member ? (
            <Link href={`/members/${invoice.member.id}`} className="text-[13.5px] text-muted hover:text-fg">
              ← Back to {invoice.member.name}
            </Link>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <EmailConfirmationButton
              memberEmail={invoice.member?.email ?? null}
              memberName={invoice.member?.name ?? "there"}
              businessName={settings.businessName}
              invoiceNumber={invoiceNumber}
              lines={lines.map((li) => ({ description: li.description, amount: signedMoney(li.quantity * li.unitPrice) }))}
              total={money(invoice.total)}
              sessionLines={sessionCredits.map((c) =>
                c.appliedIso
                  ? `${c.sessionType} — ${formatDateShort(new Date(`${c.appliedIso}T00:00:00`))}${c.appliedStart != null ? ` ${clock(c.appliedStart)}` : ""}`
                  : `${c.sessionType} — not yet scheduled`,
              )}
            />
            <PrintButton />
          </div>
        </div>

        <div className="px-1 print:px-0">
          <div className="flex flex-col items-center gap-1 pb-2 pt-8 text-center print:pt-12">
            <div className="text-[36px] leading-[0.82] font-black tracking-tight uppercase">
              {wordmarkFirst}
              {wordmarkRest.length > 0 && (
                <>
                  <br />
                  {wordmarkRest.join(" ")}
                </>
              )}
            </div>
            <div className="mt-1.5 text-[13.5px] font-semibold">{settings.businessName}</div>
          </div>

          <div className="mt-6 flex flex-wrap justify-between gap-6 border-t border-divider pt-5 text-[12.5px]">
            <div>
              <div className="font-bold">{settings.businessName}</div>
              <div className="text-pretty text-muted">{settings.address}</div>
              <div className="text-muted">{settings.phone}</div>
            </div>
            <div>
              <div className="font-bold">Client address</div>
              {invoice.member ? (
                <>
                  <div>{invoice.member.name}</div>
                  <div className="text-muted">{invoice.member.email}</div>
                </>
              ) : (
                <div>Walk-in</div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-[1fr_70px_100px] gap-3 border-b-2 border-fg pb-2 text-[11px] font-semibold tracking-wider uppercase">
              <span>Item</span>
              <span className="text-center">Quantity</span>
              <span className="text-right">Total</span>
            </div>
            {lines.map((li, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_100px] gap-3 border-b border-divider py-3 text-[13.5px]">
                <span className="font-semibold text-pretty">{li.description}</span>
                <span className="text-center tabular-nums text-muted">{li.quantity}</span>
                <span className="text-right tabular-nums">{signedMoney(li.quantity * li.unitPrice)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col items-end gap-1 text-[13.5px]">
            {subtotal != null && tax != null && (
              <>
                <div className="flex w-[220px] justify-between text-muted">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{money(subtotal)}</span>
                </div>
                <div className="flex w-[220px] justify-between text-muted">
                  <span>Tax</span>
                  <span className="tabular-nums">{money(tax)}</span>
                </div>
              </>
            )}
            <div className="flex w-[220px] justify-between border-t border-divider pt-1.5 text-[15px] font-bold">
              <span>Total amount</span>
              <span className="tabular-nums">{money(invoice.total)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-1 border-t border-divider pt-5 text-[13px]">
            <div className="flex gap-2">
              <span className="font-semibold">Purchase number:</span>
              <span className="tabular-nums text-accent">{invoiceNumber}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Purchase date:</span>
              <span className="tabular-nums text-accent">{formatDateTime(new Date(invoice.createdAt))}</span>
            </div>
          </div>

          <div className="mt-6 border-t border-divider pt-5 text-[13px]">
            {invoice.paid ? (
              <>
                <div className="font-semibold">Payment method</div>
                <div className="mt-1 text-accent">
                  {invoice.method} — {money(invoice.total)}
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-bad">Balance due</div>
                <div className="mt-1 text-bad">
                  {money(invoice.total)} — payable via {invoice.method}
                </div>
              </>
            )}
          </div>

          {sessionCredits.length > 0 && (
            <div className="mt-6 border-t border-divider pt-5 text-[13px]">
              <div className="font-semibold">Sessions this pays for</div>
              <div className="mt-1.5 flex flex-col gap-1">
                {sessionCredits.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <span>{c.sessionType}</span>
                    {c.appliedIso ? (
                      <span className="tabular-nums text-accent">
                        {formatDateShort(new Date(`${c.appliedIso}T00:00:00`))}
                        {c.appliedStart != null && ` ${clock(c.appliedStart)}`}
                      </span>
                    ) : (
                      <span className="text-muted">Not yet scheduled — on file</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-divider pt-5">
            <InvoiceNotes saleId={invoice.id} initialNotes={invoice.notes} label={invoice.paid ? "Receipt notes" : "What this bills for"} />
          </div>

          <div className="mt-8 border-t border-divider pt-5 text-center text-[12.5px] text-muted">Thanks for visiting {settings.businessName}!</div>
        </div>
      </div>
    </div>
  );
}
