"use client";

import { useEffect, useState } from "react";
import { getWaiverSignature, type WaiverDetail } from "@/server/waivers";
import { formatDateTime } from "@/lib/time";
import { XIcon } from "@/components/ui/icons";

export function WaiverViewDialog({ waiverId, onClose }: { waiverId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<WaiverDetail | null>(null);

  useEffect(() => {
    getWaiverSignature(waiverId).then(setDetail);
  }, [waiverId]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="popover-shadow flex max-h-[85vh] w-full max-w-[560px] flex-col gap-3.5 overflow-hidden rounded-2xl bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium tracking-tight">{detail?.waiverType ?? "Waiver"}</div>
            {detail && <div className="text-[13px] text-muted">Signed {formatDateTime(new Date(detail.createdAt))}</div>}
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted hover:bg-row hover:text-fg">
            <XIcon size={16} />
          </button>
        </div>

        {!detail && <div className="py-10 text-center text-[13.5px] text-muted">Loading…</div>}

        {detail && (
          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[13.5px]">
              <span className="text-muted">Signed by</span>
              <span>{detail.signerName}</span>
              {detail.minorName && (
                <>
                  <span className="text-muted">On behalf of</span>
                  <span>{detail.minorName}</span>
                </>
              )}
              {detail.pickupNames.length > 0 && (
                <>
                  <span className="text-muted">Pickup authorized</span>
                  <span>{detail.pickupNames.join(", ")}</span>
                </>
              )}
              {detail.signedByCoach && (
                <>
                  <span className="text-muted">Witnessed by</span>
                  <span>{detail.signedByCoach}</span>
                </>
              )}
            </div>

            <div className="mt-3.5">
              <span className="text-[11.5px] tracking-wider text-muted uppercase">Signature</span>
              <div className="mt-1.5 rounded-lg border border-divider bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={detail.signatureDataUrl} alt="Signature" className="h-[70px] w-full object-contain" />
              </div>
            </div>

            <div className="mt-3.5 rounded-lg border border-divider p-3 text-[12px] whitespace-pre-wrap text-pretty text-muted">
              {detail.contentSnapshot}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
