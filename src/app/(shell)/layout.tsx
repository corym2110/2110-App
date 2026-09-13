"use client";

import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { useUIStore } from "@/stores/ui";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const collapsed = useUIStore((s) => s.collapsed);

  return (
    <div className="flex min-h-screen w-full bg-bg text-fg">
      <Sidebar />
      <div
        className="flex min-w-0 flex-1 flex-col transition-[margin-left] duration-150 ease-out"
        style={{ marginLeft: collapsed ? 76 : 232 }}
      >
        <Header />
        <main className="flex min-h-0 flex-1 flex-col gap-[18px] px-[30px] pb-7 pt-6">{children}</main>
      </div>
    </div>
  );
}
