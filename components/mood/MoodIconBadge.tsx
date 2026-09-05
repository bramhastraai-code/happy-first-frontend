'use client';

import { MoodFace } from '@/components/mood/MoodFace';
import {
  DAYLIO_MOOD_OPTIONS,
  getDaylioMoodOption,
  MOOD_STICKER_COLORS,
} from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

type MoodIconSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE: Record<
  MoodIconSize,
  { box: string; face: string; emoji: string; radius: string }
> = {
  xs: { box: 'h-5 w-5', face: 'h-3.5 w-3.5', emoji: 'text-[10px]', radius: 'rounded-full' },
  sm: { box: 'h-8 w-8', face: 'h-5 w-5', emoji: 'text-base', radius: 'rounded-full' },
  md: { box: 'h-11 w-11', face: 'h-7 w-7', emoji: 'text-2xl', radius: 'rounded-full' },
  lg: { box: 'h-14 w-14', face: 'h-9 w-9', emoji: 'text-3xl', radius: 'rounded-full' },
};

function circleColor(moodId?: string | null) {
  if (!moodId) return MOOD_STICKER_COLORS[1];
  const daylio = DAYLIO_MOOD_OPTIONS.find((row) => row.value === moodId);
  if (daylio) return daylio.color;
  const mapped = getDaylioMoodOption(moodId);
  if (mapped) return mapped.color;
  const idx = Math.abs([...moodId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0));
  return MOOD_STICKER_COLORS[idx % MOOD_STICKER_COLORS.length];
}

interface MoodIconBadgeProps {
  mood?: string | null;
  emoji?: string | null;
  size?: MoodIconSize;
  className?: string;
}

/** Daylio-style colored circle + white face when mappable; else emoji on a tinted circle. */
export function MoodIconBadge({
  mood,
  emoji,
  size = 'md',
  className,
}: MoodIconBadgeProps) {
  const daylio = getDaylioMoodOption(mood);
  const dims = SIZE[size];
  const color = daylio?.color || circleColor(mood);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center leading-none',
        dims.box,
        dims.radius,
        className
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {daylio ? (
        <MoodFace kind={daylio.face} className={dims.face} />
      ) : (
        <span className={cn('leading-none', dims.emoji)}>{emoji || '🙂'}</span>
      )}
    </span>
  );
}
