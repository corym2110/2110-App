"use client";

import { useState, useTransition } from "react";
import { updateInvoiceNotes } from "@/server/sales";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent"
    >
      Print / Save as PDF
    </button>
  );
}

/** Opens the staff member's own email client with the receipt pre-filled — a real, working "send
    confirmation email" today, without needing Postmark (or any server-side email sending) set up.
    Once Postmark is configured this can become an automatic send instead. */
export function EmailConfirmationButton({
  memberEmail,
  memberName,
  businessName,
  invoiceNumber,
  lines,
  total,
  sessionLines,
}: {
  memberEmail: string | null;
  memberName: string;
  businessName: string;
  invoiceNumber: string;
  lines: { description: string; amount: string }[];
  total: string;
  sessionLines: string[];
}) {
  if (!memberEmail) return null;

  const bodyParts = [
    `Hi ${memberName.split(" ")[0]},`,
    "",
    `Thanks for your purchase from ${businessName} (receipt #${invoiceNumber}):`,
    "",
    ...lines.map((l) => `  ${l.description} — ${l.amount}`),
    "",
    `Total: ${total}`,
  ];
  if (sessionLines.length > 0) {
    bodyParts.push("", "This covers the following sessions:", ...sessionLines.map((s) => `  ${s}`));
  }
  bodyParts.push("", `— ${businessName}`);

  const href = `mailto:${encodeURIComponent(memberEmail)}?subject=${encodeURIComponent(`Your receipt from ${businessName} (#${invoiceNumber})`)}&body=${encodeURIComponent(bodyParts.join("\n"))}`;

  return (
    <a href={href} className="print:hidden grid h-10 place-items-center rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
      Email confirmation
    </a>
  );
}

export function InvoiceNotes({ saleId, initialNotes, label = "What this bills for" }: { saleId: string; initialNotes: string | null; label?: string }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateInvoiceNotes(saleId, notes);
      setSaved(notes);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] tracking-wider text-muted uppercase">{label}</div>
          <p className="mt-1 text-pretty text-[13.5px]">{saved || <span className="text-muted">No comment added.</span>}</p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="print:hidden flex-none text-[12.5px] text-link hover:text-link-hover">
          {saved ? "Edit" : "Add comment"}
        </button>
      </div>
    );
  }

  return (
    <div className="print:hidden">
      <div className="text-[11px] tracking-wider text-muted uppercase">{label}</div>
      <textarea
        autoFocus
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. PT sessions Sep 1–15, three make-up sessions from August…"
        rows={3}
        className="mt-1.5 w-full rounded-lg border border-divider bg-transparent px-2.5 py-2 text-[13.5px]"
      />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={save} disabled={isPending} className="h-8 rounded-full bg-accent px-3.5 text-[12.5px] font-semibold text-on-accent disabled:opacity-60">
          {isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => { setNotes(saved ?? ""); setEditing(false); }} className="h-8 rounded-full border border-divider px-3.5 text-[12.5px] hover:bg-row">
          Cancel
        </button>
      </div>
    </div>
  );
}
