import type { ButtonHTMLAttributes } from "react";

export function HeaderButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-4 text-[13.5px] font-semibold text-on-accent ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
