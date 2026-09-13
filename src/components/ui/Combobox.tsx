"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A free-text input with a custom-rendered suggestion list, replacing the native
 * <input list="…"><datalist> pattern. Native datalist popups are OS/browser chrome
 * that can silently fail to appear at all in some browser configurations (the same
 * class of bug we hit with native <select> popups) — this renders suggestions
 * ourselves so they're guaranteed to show up and match the app's theme.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  maxSuggestions = 8,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  maxSuggestions?: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const q = value.trim().toLowerCase();
  const suggestions = options.filter((o) => !q || o.toLowerCase().includes(q)).slice(0, maxSuggestions);
  const showList = open && suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0].toLowerCase() === q);

  return (
    <div ref={rootRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`border border-divider bg-transparent ${className}`}
      />
      {showList && (
        <div className="popover-shadow absolute left-0 top-[calc(100%+4px)] z-[70] max-h-52 min-w-full overflow-y-auto rounded-lg bg-surface py-1">
          {suggestions.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="block w-full truncate whitespace-nowrap px-3 py-1.5 text-left text-sm text-fg hover:bg-row"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
