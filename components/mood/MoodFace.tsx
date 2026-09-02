import type { DaylioMoodFace } from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

interface MoodFaceProps {
  kind: DaylioMoodFace;
  className?: string;
}

/** Simple Daylio-style face drawn in white on a colored circle. */
export function MoodFace({ kind, className }: MoodFaceProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('text-white', className)}
      fill="none"
      aria-hidden
    >
      {kind === 'rad' ? (
        <>
          <path
            d="M11 22c3-5 9-5 12 0"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M25 22c3-5 9-5 12 0"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M13 29c3 9 19 9 22 0"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'good' ? (
        <>
          <circle cx="17" cy="20" r="2.2" fill="currentColor" />
          <circle cx="31" cy="20" r="2.2" fill="currentColor" />
          <path
            d="M16 29c3 6 13 6 16 0"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'meh' ? (
        <>
          <circle cx="17" cy="20" r="2.2" fill="currentColor" />
          <circle cx="31" cy="20" r="2.2" fill="currentColor" />
          <path
            d="M16 30h16"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'bad' ? (
        <>
          <circle cx="17" cy="20" r="2.2" fill="currentColor" />
          <circle cx="31" cy="20" r="2.2" fill="currentColor" />
          <path
            d="M16 32c3-5 13-5 16 0"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </>
      ) : null}
      {kind === 'awful' ? (
        <>
          <path
            d="M13 16l7 6"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M20 16l-7 6"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M28 16l7 6"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M35 16l-7 6"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M15 34c3-7 15-7 18 0"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </>
      ) : null}
    </svg>
  );
}
