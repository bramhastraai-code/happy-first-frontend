'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dailyMoodAPI, dailyMoodQueryKeys } from '@/lib/api/dailyMood';
import { DailyMoodPickerSheet } from '@/components/mood/DailyMoodPickerSheet';
import { MoodFace } from '@/components/mood/MoodFace';
import {
  getDaylioMoodOption,
  isDailyMoodActive,
  type DailyMoodView,
} from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

interface HeaderTodayMoodProps {
  profileId?: string;
  className?: string;
}

/** Compact “today’s mood” line for page headers — tap to update. */
export function HeaderTodayMood({ profileId, className }: HeaderTodayMoodProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const moodQuery = useQuery({
    queryKey: dailyMoodQueryKeys.mine(profileId),
    enabled: Boolean(profileId),
    queryFn: async () => {
      const res = await dailyMoodAPI.getMine();
      return res.data.data;
    },
    staleTime: 30_000,
  });

  if (!profileId) return null;

  const mood: DailyMoodView | null = isDailyMoodActive(moodQuery.data) ? moodQuery.data! : null;
  const daylio = getDaylioMoodOption(mood?.mood);

  return (
    <div className={cn('block min-w-0', className)}>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex max-w-full items-center gap-1.5 text-left text-xs text-muted-foreground"
        aria-label={daylio ? `Today’s mood: ${daylio.label}` : "Set today’s mood"}
      >
        {daylio ? (
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: daylio.color }}
          >
            <MoodFace kind={daylio.face} className="h-2.5 w-2.5" />
          </span>
        ) : (
          <span className="text-[11px]">🙂</span>
        )}
        <span className="min-w-0 truncate">
          {daylio ? `Feeling ${daylio.label}` : "Set today’s mood"}
        </span>
      </button>

      <DailyMoodPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentMood={mood}
        profileId={profileId}
        onSaved={() => {
          void moodQuery.refetch();
        }}
      />
    </div>
  );
}
