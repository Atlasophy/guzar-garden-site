/**
 * The inline SVGs the original pages carried, lifted out unchanged.
 *
 * They stay inline rather than becoming sprite references because several of
 * them are tinted with `currentColor` and animated by the theme's own hover
 * rules, and a sprite would put them behind a fetch the first paint has to wait
 * for.
 */

export function OrnamentDivider({ className = 'orn' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M0 11h40M80 11h40" />
      <path d="M60 3l6 8-6 8-6-8z" />
      <circle cx="48" cy="11" r="3" />
      <circle cx="72" cy="11" r="3" />
    </svg>
  );
}

export function CartoucheCorner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <svg
      className={`q-corner ${position}`}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M4 60V14a10 10 0 0 1 10-10h46" />
      <path d="M18 60V26a8 8 0 0 1 8-8h34" strokeOpacity=".45" />
      <path d="M11 11l5-5 5 5-5 5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function KazanIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M8 20h32a16 16 0 0 1-16 16A16 16 0 0 1 8 20Z" />
      <path d="M4 20h40M14 36l-3 6M34 36l3 6" />
      <path d="M18 12c0-3 3-3 3-6M27 12c0-3 3-3 3-6" />
    </svg>
  );
}

export function TandoorIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M14 42V22a10 10 0 0 1 20 0v20Z" />
      <path d="M10 42h28M18 22h12" />
      <path d="M24 16c0-4-4-5-4-9M31 16c0-3-3-4-3-7" />
    </svg>
  );
}

export function FireIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M6 16h36M6 26h36M6 36h36" />
      <circle cx="16" cy="16" r="2.5" />
      <circle cx="28" cy="16" r="2.5" />
      <circle cx="20" cy="26" r="2.5" />
      <circle cx="32" cy="26" r="2.5" />
      <circle cx="16" cy="36" r="2.5" />
      <circle cx="28" cy="36" r="2.5" />
    </svg>
  );
}

export function DastarkhanIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round">
      <circle cx="24" cy="24" r="15" />
      <circle cx="24" cy="24" r="7" />
      <path d="M24 9v6M24 33v6M9 24h6M33 24h6M13.4 13.4l4.3 4.3M30.3 30.3l4.3 4.3M34.6 13.4l-4.3 4.3M17.7 30.3l-4.3 4.3" />
    </svg>
  );
}

export function GardenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3c4 4 7 6 7 10a7 7 0 1 1-14 0c0-4 3-6 7-10Z" />
    </svg>
  );
}

export function FireplaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

export function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

export function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

export function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19.5" r="1" />
      <path d="M2 9a15 15 0 0 1 20 0" />
    </svg>
  );
}

export function ParkingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9.5 17V7h3a3 3 0 0 1 0 6h-3" />
    </svg>
  );
}

export function AccessibleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="4" r="2" />
      <path d="M10 8v6h6l3 6M10 14l-3 6" />
    </svg>
  );
}

export function TakeawayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 8h11l3 5v6H5z" />
      <circle cx="8.5" cy="19" r="1.8" />
      <circle cx="16" cy="19" r="1.8" />
      <path d="M9 4c0 1.5-1.5 1.5-1.5 3M13 4c0 1.5-1.5 1.5-1.5 3" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.5-1.5H17V4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.6v3h2.7v8z" />
    </svg>
  );
}

export function TripAdvisorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8.2" cy="13.2" r="3.4" />
      <circle cx="15.8" cy="13.2" r="3.4" />
      <path d="M8.2 13.2a3.6 3.6 0 0 1 7.6 0M2.5 9.8h3.4M18.1 9.8h3.4M9.5 6.4c1-.9 4-.9 5 0" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />
    </svg>
  );
}

export function ExternalArrowIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function EmptySearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5M8.5 11h5" />
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ChevronRightIcon({ strokeWidth = 2.4 }: { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
