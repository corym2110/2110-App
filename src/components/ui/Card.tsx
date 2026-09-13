import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card-shadow rounded-2xl bg-surface ${className}`}>{children}</section>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h5 className="text-[15.5px] font-semibold">{children}</h5>;
}
