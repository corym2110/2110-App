"use client";

import { useRef, useState, useTransition } from "react";
import { signWaiver, type WaiverType } from "@/server/waivers";
import { ADULT_LIABILITY_WAIVER } from "@/data/waivers/adultLiabilityWaiver";
import { YOUTH_WAIVER } from "@/data/waivers/youthWaiver";
import { useCurrentCoach } from "@/lib/useCoaches";
import { XIcon, PlusIcon } from "@/components/ui/icons";
import type { Member } from "@/types";

const WAIVER_TYPES: WaiverType[] = ["Adult Liability Waiver", "Youth Waiver"];

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1c1e1c";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={140}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full touch-none rounded-lg border border-divider bg-white"
        style={{ height: 140 }}
      />
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[12px] text-muted">Sign above with mouse or finger</span>
        <button type="button" onClick={clear} className="text-[12.5px] text-muted hover:text-fg">
          Clear
        </button>
      </div>
    </div>
  );
}

export function SignWaiverDialog({ member, onClose, onSigned }: { member: Member; onClose: () => void; onSigned: () => void }) {
  const coach = useCurrentCoach();
  const [waiverType, setWaiverType] = useState<WaiverType>("Adult Liability Waiver");
  const [signerName, setSignerName] = useState("");
  const [minorName, setMinorName] = useState(member.name);
  const [pickupNames, setPickupNames] = useState<string[]>([""]);
  const [agreed, setAgreed] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isYouth = waiverType === "Youth Waiver";
  const blocks = isYouth ? YOUTH_WAIVER : ADULT_LIABILITY_WAIVER;
  const canSave = agreed && signerName.trim().length > 1 && !!signatureDataUrl;

  function save() {
    if (!canSave || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await signWaiver({
          memberId: member.id,
          waiverType,
          signerName,
          minorName: isYouth ? minorName : undefined,
          pickupNames: isYouth ? pickupNames.filter((n) => n.trim()) : undefined,
          signatureDataUrl: signatureDataUrl!,
          signedByCoachId: coach?.id,
        });
        onSigned();
        onClose();
      } catch {
        setError("Couldn't save that signature. Try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[90vh] w-full max-w-[560px] flex-col gap-3.5 overflow-hidden rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">Sign waiver</div>
            <div className="text-[13px] text-muted">For {member.name}, in person on this device.</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        <div className="flex gap-1.5 rounded-[11px] border border-divider p-1">
          {WAIVER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setWaiverType(t)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-[13px] ${waiverType === t ? "bg-row font-semibold text-fg" : "text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <div className="flex flex-col gap-3 rounded-xl border border-divider p-3.5 text-[12.5px] text-pretty">
            {blocks.map((b, i) => (
              <div key={i}>
                {b.heading && <div className="mb-1 font-semibold">{b.heading}</div>}
                <p className="text-muted">{b.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">{isYouth ? "Guardian's full legal name" : "Your full legal name"}</span>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Type your name"
                className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
              />
            </label>

            {isYouth && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11.5px] tracking-wider text-muted uppercase">Child&apos;s full name</span>
                  <input
                    value={minorName}
                    onChange={(e) => setMinorName(e.target.value)}
                    className="h-10 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <span className="text-[11.5px] tracking-wider text-muted uppercase">Authorized to pick up child</span>
                  {pickupNames.map((n, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        value={n}
                        onChange={(e) => setPickupNames((ns) => ns.map((x, idx) => (idx === i ? e.target.value : x)))}
                        placeholder={`Person ${i + 1}`}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-divider bg-transparent px-2.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setPickupNames((ns) => (ns.length > 1 ? ns.filter((_, idx) => idx !== i) : ns))}
                        disabled={pickupNames.length === 1}
                        className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-bad disabled:opacity-30"
                      >
                        <XIcon size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickupNames((ns) => [...ns, ""])}
                    className="flex h-8 w-fit items-center gap-1.5 rounded-full border border-divider px-3 text-[12.5px] hover:bg-row"
                  >
                    <PlusIcon size={12} />
                    Add person
                  </button>
                </div>
              </>
            )}

            <label className="flex items-start gap-2 text-[12.5px]">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none" />
              <span>I have read the waiver above and agree to its terms on {isYouth ? "my child's" : "my own"} behalf.</span>
            </label>

            <div>
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Signature</span>
              <div className="mt-1.5">
                <SignaturePad onChange={setSignatureDataUrl} />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="rounded-lg bg-bad/10 px-3 py-2.5 text-[12.5px] text-bad">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full border border-divider px-4 text-[13.5px] hover:bg-row">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || isPending}
            className="h-10 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save signed waiver"}
          </button>
        </div>
      </div>
    </div>
  );
}
