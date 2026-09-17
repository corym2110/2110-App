import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps, children: React.ReactNode) {
  const { size = 18, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: IconProps) =>
  base(p, (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.8V20h14V9.8" />
      <path d="M10 20v-6h4v6" />
    </>
  ));

export const ScheduleIcon = (p: IconProps) =>
  base(p, (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ));

export const ClassesIcon = (p: IconProps) =>
  base(p, (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="16" cy="8" r="2.6" />
      <path d="M3.5 19c0-2.8 2-4.4 4.5-4.4s4.5 1.6 4.5 4.4" />
      <path d="M13.5 19c0-2.8 1.6-4.4 4-4.4s3 1.6 3 4.4" />
    </>
  ));

export const MembersIcon = (p: IconProps) =>
  base(p, (
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <path d="M16 5.4a3.2 3.2 0 0 1 0 5.6M18.4 19.6c0-2.6-.9-4.2-2.4-5.2" />
    </>
  ));

export const POSIcon = (p: IconProps) =>
  base(p, (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2.5" />
      <path d="M3 9.5h18M7.5 20h9" />
    </>
  ));

export const ReportsIcon = (p: IconProps) =>
  base(p, <path d="M4 19V9M9.3 19V5M14.7 19v-7M20 19v-4" />);

export const BillingIcon = (p: IconProps) =>
  base(p, (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ));

export const SettingsIcon = (p: IconProps) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.2 14.6a1.5 1.5 0 0 0 .3 1.65l.06.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V20a1.8 1.8 0 0 1-3.6 0v-.1a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06a1.8 1.8 0 1 1-2.55-2.55l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H4a1.8 1.8 0 0 1 0-3.6h.1a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.06-.06a1.8 1.8 0 1 1 2.55-2.55l.06.06a1.5 1.5 0 0 0 1.65.3H9.5a1.5 1.5 0 0 0 .9-1.37V4a1.8 1.8 0 0 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.06a1.5 1.5 0 0 0 1.37.9H20a1.8 1.8 0 0 1 0 3.6h-.1a1.5 1.5 0 0 0-1.37.9Z" />
    </>
  ));

export const SearchIcon = (p: IconProps) =>
  base(p, (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ));

export const SunIcon = (p: IconProps) =>
  base(p, (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </>
  ));

export const MoonIcon = (p: IconProps) =>
  base(p, <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />);

export const BellIcon = (p: IconProps) =>
  base(p, (
    <>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.4 5.4 1.4 5.4H4.6S6 14 6 10Z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </>
  ));

export const PlusIcon = (p: IconProps) => base(p, <path d="M12 5v14M5 12h14" />);

export const XIcon = (p: IconProps) => base(p, <path d="M6 6l12 12M18 6 6 18" />);

export const ChevronLeftIcon = (p: IconProps) => base(p, <path d="m14 6-6 6 6 6" />);
export const ChevronRightIcon = (p: IconProps) => base(p, <path d="m10 6 6 6-6 6" />);

export const CheckIcon = (p: IconProps) => base(p, <path d="m5 12.5 4.5 4.5L19 7.5" />);

export const PanelToggleIcon = ({ chevron, ...p }: IconProps & { chevron: string }) =>
  base(p, (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M9.5 4.5v15" />
      <path d={chevron} />
    </>
  ));

export const ExportIcon = (p: IconProps) =>
  base(p, (
    <>
      <path d="M12 4v11" />
      <path d="m8 11.5 4 4 4-4" />
      <path d="M5 19.5h14" />
    </>
  ));

export const ExternalLinkIcon = (p: IconProps) =>
  base(p, (
    <>
      <path d="M8 5h11v11" />
      <path d="M19 5 6 18" />
    </>
  ));

export const PencilIcon = (p: IconProps) => base(p, <path d="M4 20h4L20 8l-4-4L4 16v4Z" />);
