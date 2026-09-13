"use client";

import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A fully custom-rendered dropdown, styled entirely by us instead of relying
 * on the browser/OS's native <select> popup. Native select popups render as
 * OS-level chrome on some browsers (notably on Windows, even in Chromium),
 * which CSS (color-scheme, explicit option colors) can't reliably reach —
 * this sidesteps that entirely so dark mode is guaranteed correct everywhere.
 */
export function Select({
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(ev: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between gap-2 border bg-transparent text-left disabled:cursor-not-allowed disabled:opacity-45 ${
          open ? "border-accent" : "border-divider"
        } ${className}`}
      >
        <span className={`min-w-0 truncate ${selected ? "" : "text-muted"}`}>{selected?.label ?? placeholder ?? ""}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-muted">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="popover-shadow absolute left-0 top-[calc(100%+4px)] z-[70] max-h-64 min-w-full overflow-y-auto rounded-lg bg-surface py-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`block w-full whitespace-nowrap px-3 py-1.5 text-left text-sm hover:bg-row ${
                o.value === value ? "bg-accent/15 font-medium text-fg" : "text-fg"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
