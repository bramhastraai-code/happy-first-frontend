'use client';

import { MoodFace } from '@/components/mood/MoodFace';
import {
  DAYLIO_MOOD_OPTIONS,
  type DailyMoodValue,
} from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

interface HowAreYouMoodRowProps {
  selected?: DailyMoodValue | '' | null;
  onSelect: (value: DailyMoodValue) => void;
  disabled?: boolean;
}

export function HowAreYouMoodRow({
  selected,
  onSelect,
  disabled = false,
}: HowAreYouMoodRowProps) {
  return (
    <div className="flex items-start justify-between gap-1">
      {DAYLIO_MOOD_OPTIONS.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5 disabled:opacity-60"
          >
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full transition-transform sm:h-14 sm:w-14',
                isSelected && 'scale-110 ring-2 ring-foreground/15 ring-offset-2'
              )}
              style={{ backgroundColor: option.color }}
            >
              <MoodFace kind={option.face} className="h-8 w-8 sm:h-9 sm:w-9" />
            </span>
            <span
              className="text-[11px] font-medium capitalize leading-none sm:text-xs"
              style={{ color: option.color }}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
