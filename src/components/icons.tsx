type IconProps = {
  className?: string;
};

export function TagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10.5 3.5H16a.5.5 0 01.5.5v5.5a1 1 0 01-.3.7l-6.9 6.9a1 1 0 01-1.4 0l-5.6-5.6a1 1 0 010-1.4l6.9-6.9a1 1 0 01.7-.3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="13.2" cy="6.8" r="1.1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function GiftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="8.5" width="14" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8.5h14M10 8.5v8" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 8.5c0-2 -1.5-3.5-3-3.5-1.2 0-2 .8-2 1.8S5.8 8.5 7 8.5h3zM10 8.5c0-2 1.5-3.5 3-3.5 1.2 0 2 .8 2 1.8S14.2 8.5 13 8.5h-3z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 7.3v5.4l4.3-2.7-4.3-2.7z" fill="currentColor" />
    </svg>
  );
}

export function DoubleCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 10.2l1.8 1.8 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 10.2l1.8 1.8 3.7-3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 9.5L10 4l6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 8.5V16h9V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 8h13" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13 12.2c1.9.2 3.5 1.6 3.5 3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ScissorsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.5" cy="14.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 6.5L16 15M7 13.5L16 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5.5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 10.5h2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M6 8.5c0-2.2 1.8-4 4-4s4 1.8 4 4v3l1.3 2.2H4.7L6 11.5v-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.5 15.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 3.5v1.8M10 14.7v1.8M16.5 10h-1.8M5.3 10H3.5M14.6 5.4l-1.3 1.3M6.7 13.3l-1.3 1.3M14.6 14.6l-1.3-1.3M6.7 6.7L5.4 5.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function UserPlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16c0-2.6 2.2-4.3 5-4.3s5 1.7 5 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15.5 6.5v4M13.5 8.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ZapIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M11 3L5 11h4l-1 6 6-8h-4l1-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h14M10 3c2 2.2 3 4.5 3 7s-1 4.8-3 7c-2-2.2-3-4.5-3-7s1-4.8 3-7z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function MoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="4" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="4" y="11" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="11" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M12 4.5L6.5 10l5.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M8 4.5L13.5 10 8 15.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.5 3.5h2l1 3-1.6 1.3a8 8 0 004.3 4.3l1.3-1.6 3 1v2c0 .8-.7 1.5-1.5 1.4-6-.5-9.8-4.3-10.3-10.3-.1-.8.6-1.5 1.4-1.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M12.6 4.4l3 3-8 8-3.4.6.6-3.4 7.8-8.2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 3.3l7.5 13a1 1 0 01-.87 1.5H3.37a1 1 0 01-.87-1.5l7.5-13a1 1 0 011.74 0z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 8.3v3.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function CashIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="5.5" width="15" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8v4M15 8v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.2 13.2L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 10c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6-2.9 6-6.5 6c-.8 0-1.5-.1-2.2-.4L4.5 17l1-3.3C4.1 12.6 3.5 11.4 3.5 10z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MessageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="14" height="10" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 6.5l6 4.5 6-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4 5.5A7 7 0 1110 17a7 7 0 01-5.6-2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4 3v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 7v3.5l2.3 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function UserXIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16c0-2.6 2.2-4.3 5-4.3s5 1.7 5 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 6.5l3.5 3.5M17.5 6.5L14 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="7" y="7" width="9.5" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13.5 7V5.5A1.5 1.5 0 0012 4H5A1.5 1.5 0 003.5 5.5v7A1.5 1.5 0 005 14h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9.2v4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="6.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 17s5.5-5.1 5.5-9A5.5 5.5 0 004.5 8c0 3.9 5.5 9 5.5 9z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="3" width="9" height="14" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 8.5h3v8.5h-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 6h1.5M6.5 9h1.5M6.5 12h1.5M9.5 6h1M9.5 9h1M9.5 12h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7.3 17v-2.5h2.4V17" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="7.3" cy="8" r="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 14.5l4-4 3 3 2.5-2.5 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function PaletteIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 3.5a6.5 6.5 0 100 13c.8 0 1.4-.6 1.4-1.4 0-.4-.2-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.6-1.4 1.4-1.4h1.6a2.5 2.5 0 002.5-2.5C16.5 6 13.6 3.5 10 3.5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="6.7" cy="8.2" r="1" fill="currentColor" />
      <circle cx="8.5" cy="6" r="1" fill="currentColor" />
      <circle cx="11.8" cy="6.2" r="1" fill="currentColor" />
      <circle cx="13.5" cy="8.6" r="1" fill="currentColor" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="12.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function DatabaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <ellipse cx="10" cy="5.5" rx="6" ry="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 5.5v9c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.8 5.3C1.9 6.4 1.5 7.4 1.5 7.4S4.5 12.9 10 12.9c1 0 1.9-.2 2.7-.5M7.6 5.1c.7-.2 1.5-.3 2.4-.3 5.5 0 8.5 5.5 8.5 5.5s-.6 1.1-1.7 2.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.2 8.7a2.5 2.5 0 003.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.5 2.5l15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PowerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 3.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 5.3a6 6 0 108-.03" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
