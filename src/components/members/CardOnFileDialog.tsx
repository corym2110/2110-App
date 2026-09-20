"use client";

import { useEffect, useRef, useState } from "react";
import { saveCardForMember } from "@/server/clover";
import { XIcon } from "@/components/ui/icons";

const SDK_SRC = "https://checkout.sandbox.dev.clover.com/sdk.js";

/** Minimal shape of the global Clover.js SDK we actually use — there's no official types
    package, and the full SDK surface is much bigger than this. */
interface CloverElement {
  mount: (selector: string) => void;
}
interface CloverElements {
  create: (field: "CARD_NUMBER" | "CARD_DATE" | "CARD_CVV" | "CARD_POSTAL_CODE") => CloverElement;
}
interface CloverSdk {
  elements: () => CloverElements;
  createToken: () => Promise<{ token?: string; errors?: Record<string, { error?: string }> }>;
}
declare global {
  interface Window {
    Clover?: new (apiKey: string, opts: { merchantId: string }) => CloverSdk;
  }
}

function loadCloverSdk(): Promise<void> {
  if (window.Clover) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Clover's payment SDK."));
    document.head.appendChild(script);
  });
}

export function CardOnFileDialog({ memberId, memberName, onClose, onSaved }: { memberId: string; memberName: string; onClose: () => void; onSaved: () => void }) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloverRef = useRef<CloverSdk | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        const publicKey = process.env.NEXT_PUBLIC_CLOVER_PUBLIC_TOKEN;
        const merchantId = process.env.NEXT_PUBLIC_CLOVER_MERCHANT_ID;
        if (!publicKey || !merchantId) throw new Error("Clover isn't configured yet.");
        return loadCloverSdk().then(() => ({ publicKey, merchantId }));
      })
      .then((creds) => {
        if (cancelled || !creds || !window.Clover) return;
        const clover = new window.Clover(creds.publicKey, { merchantId: creds.merchantId });
        cloverRef.current = clover;
        const elements = clover.elements();
        elements.create("CARD_NUMBER").mount("#clover-card-number");
        elements.create("CARD_DATE").mount("#clover-card-date");
        elements.create("CARD_CVV").mount("#clover-card-cvv");
        elements.create("CARD_POSTAL_CODE").mount("#clover-card-postal");
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load Clover.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function save() {
    if (!cloverRef.current || submitting) return;
    setSubmitting(true);
    setError(null);
    cloverRef.current
      .createToken()
      .then(async (result) => {
        if (result.errors) {
          const first = Object.values(result.errors).find((e) => e.error)?.error;
          setError(first ?? "Check the card details and try again.");
          setSubmitting(false);
          return;
        }
        if (!result.token) {
          setError("Couldn't tokenize that card. Try again.");
          setSubmitting(false);
          return;
        }
        const saveResult = await saveCardForMember(memberId, result.token);
        if (!saveResult.ok) {
          setError(saveResult.error ?? "Clover rejected that card. Double-check the number and try again.");
          setSubmitting(false);
          return;
        }
        onSaved();
        onClose();
      })
      .catch(() => {
        setError("Couldn't reach Clover. Try again.");
        setSubmitting(false);
      });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex w-full max-w-[440px] flex-col gap-3.5 rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Save a card</div>
            <div className="text-[13px] text-muted">On file for {memberName} — used for future charges, never stored by us directly.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Card number</span>
          <div id="clover-card-number" className="h-10 rounded-lg border border-divider px-2.5 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">Expiry</span>
            <div id="clover-card-date" className="h-10 rounded-lg border border-divider px-2.5 py-2" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] tracking-wider text-muted uppercase">CVV</span>
            <div id="clover-card-cvv" className="h-10 rounded-lg border border-divider px-2.5 py-2" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11.5px] tracking-wider text-muted uppercase">Postal code</span>
          <div id="clover-card-postal" className="h-10 rounded-lg border border-divider px-2.5 py-2" />
        </label>

        {error && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{error}</div>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!ready || submitting}
            className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save card"}
          </button>
        </div>
      </div>
    </div>
  );
}
