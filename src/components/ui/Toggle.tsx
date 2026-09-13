export function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={`relative h-6 w-[42px] flex-none rounded-full border-0 p-0 transition-colors ${
        on ? "bg-accent" : "bg-divider"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full transition-[left] ${
          on ? "left-[21px] bg-on-accent" : "left-[3px] bg-muted"
        }`}
      />
    </button>
  );
}
