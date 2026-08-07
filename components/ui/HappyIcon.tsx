import { cn } from '@/lib/utils';

type HappyIconProps = {
  className?: string;
  strokeWidth?: number;
  /** Liked / active state — filled happy face */
  filled?: boolean;
};

/**
 * Brand “happy” reaction icon (replaces heart likes in feed & community).
 * Matches Lucide sizing so existing `h-5 w-5` classes keep working.
 */
export function HappyIcon({ className, strokeWidth = 2, filled = false }: HappyIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5 shrink-0', className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      {filled ? (
        <>
          <circle cx="9" cy="10" r="1.35" fill="#fff" stroke="none" />
          <circle cx="15" cy="10" r="1.35" fill="#fff" stroke="none" />
          <path d="M8 14.25s1.6 2.5 4 2.5 4-2.5 4-2.5" fill="none" stroke="#fff" />
        </>
      ) : (
        <>
          <path d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </>
      )}
    </svg>
  );
}
