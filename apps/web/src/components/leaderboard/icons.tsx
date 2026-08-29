// Small inline icon set for the leaderboard, matching the stroke-based
// convention already used in components/layout/DashboardLayout.tsx.

export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H5a2 2 0 0 0 0 4h1.5M16 5h3a2 2 0 0 1 0 4h-1.5" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 16.5h4l.6 3.5H9.4l.6-3.5Z" />
    </svg>
  );
}

export function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 8.5 7 11l5-6.5L17 11l4-2.5-1.6 9.5a1 1 0 0 1-1 .84H5.6a1 1 0 0 1-1-.84L3 8.5Z" />
      <path d="M5.5 19.5h13v1.5h-13z" />
    </svg>
  );
}

export function MedalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9.8 13 12h2.2l-1.8 1.4.7 2.2-2.1-1.3-2.1 1.3.7-2.2L8.8 12H11l1-2.2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5 14.9 8.7l6.8.8-5 4.7 1.3 6.8-6-3.3-6 3.3 1.3-6.8-5-4.7 6.8-.8L12 2.5Z" />
    </svg>
  );
}

export function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

export function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}
