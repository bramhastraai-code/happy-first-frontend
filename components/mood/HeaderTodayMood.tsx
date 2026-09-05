'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HeaderTodayMoodProps {
  profileId?: string;
  className?: string;
}

/**
 * Compact header link to the Mood page.
 * Does not load or display the current mood on Home / headers.
 */
export function HeaderTodayMood({ profileId, className }: HeaderTodayMoodProps) {
  if (!profileId) return null;

  return (
    <Link
      href="/mood"
      className={cn(
        'text-xs font-medium text-muted-foreground transition-colors hover:text-primary',
        className
      )}
    >
      Mood
    </Link>
  );
}
