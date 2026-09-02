'use client';

import { cn } from '@/lib/utils';
import type { DailyMoodView } from '@/lib/utils/dailyMood';
import { formatDailyMoodInline } from '@/lib/utils/dailyMood';

interface DailyMoodInlineProps {
  mood?: DailyMoodView | null;
  className?: string;
  /** Prefix separator before mood, e.g. em dash */
  separator?: string;
}

/** Compact inline mood next to a name — only renders when mood is present. */
export function DailyMoodInline({
  mood,
  className,
  separator = ' — ',
}: DailyMoodInlineProps) {
  const text = formatDailyMoodInline(mood);
  if (!text) return null;

  return (
    <span className={cn('font-medium text-muted-foreground', className)}>
      {separator}
      <span aria-label={`Mood: ${mood?.label}`}>{text}</span>
    </span>
  );
}
