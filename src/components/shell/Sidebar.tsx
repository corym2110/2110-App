"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useUIStore } from "@/stores/ui";
import {
  DashboardIcon,
  ScheduleIcon,
  ClassesIcon,
  MembersIcon,
  POSIcon,
  ReportsIcon,
  SettingsIcon,
} from "@/components/ui/icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/schedule", label: "Schedule", Icon: ScheduleIcon },
  { href: "/classes", label: "Classes", Icon: ClassesIcon },
  { href: "/members", label: "Members", Icon: MembersIcon },
  { href: "/pos", label: "POS", Icon: POSIcon },
  { href: "/reports", label: "Reports", Icon: ReportsIcon },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.collapsed);
  const pathname = usePathname();
  const { user } = useUser();
  const width = collapsed ? 76 : 232;
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Coach";

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 z-20 flex flex-col gap-6 overflow-hidden bg-sidebar text-sidebar-fg py-6 px-4 transition-[width] duration-150 ease-out"
      style={{ width }}
    >
      <div className={`flex items-center gap-2.5 pl-1.5 ${collapsed ? "justify-center" : ""}`}>
        <div className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-accent text-on-accent text-[12.5px] font-bold">
          2
        </div>
        {!collapsed && <span className="whitespace-nowrap text-[17px] font-semibold tracking-wide">2110 Fitness</span>}
      </div>

      <div className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] overflow-hidden ${
                collapsed ? "justify-center" : ""
              } ${active ? "bg-accent text-on-accent font-semibold" : "text-white/76 hover:bg-white/8 hover:text-white"}`}
            >
              <Icon size={18} className="flex-none" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5 border-t border-white/12 pt-3">
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm overflow-hidden ${
            collapsed ? "justify-center" : ""
          } ${pathname === "/settings" ? "bg-accent text-on-accent font-semibold" : "text-white/66 hover:bg-white/8 hover:text-white"}`}
        >
          <SettingsIcon size={17} className="flex-none" />
          {!collapsed && <span className="whitespace-nowrap">Settings</span>}
        </Link>
        <div className={`mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 overflow-hidden ${collapsed ? "justify-center" : ""}`}>
          <UserButton
            appearance={{
              elements: { avatarBox: "h-[30px] w-[30px]" },
            }}
          />
          {!collapsed && (
            <Link href="/preferences" className="min-w-0 hover:opacity-80">
              <div className="truncate text-[13.5px] font-medium">{displayName}</div>
              <div className="text-[11.5px] text-white/55">Facility Supervisor</div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
