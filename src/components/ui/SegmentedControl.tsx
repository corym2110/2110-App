export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 rounded-[11px] border border-divider p-1 ${className}`}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] ${
              active ? "bg-row font-semibold text-fg" : "font-normal text-muted"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
