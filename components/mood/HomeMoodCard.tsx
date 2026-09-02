'use client';

import { useEffect, useState } from 'react';
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

interface HomeMoodCardProps {
  profileId?: string;
  suppressed?: boolean;
  className?: string;
}

function promptKey(profileId: string) {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `hf-mood-prompt:${profileId}:${day}`;
}

export function HomeMoodCard({
  profileId,
  suppressed = false,
  className,
}: HomeMoodCardProps) {
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

  const mood: DailyMoodView | null = isDailyMoodActive(moodQuery.data) ? moodQuery.data! : null;
  const daylio = getDaylioMoodOption(mood?.mood);

  useEffect(() => {
    if (suppressed || !profileId || moodQuery.isLoading) return;
    if (mood) return;
    try {
      const key = promptKey(profileId);
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, '1');
      setPickerOpen(true);
    } catch {
      setPickerOpen(true);
    }
  }, [suppressed, profileId, mood, moodQuery.isLoading]);

  if (!profileId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-[1.5rem] border border-border bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/40',
          className
        )}
      >
        {daylio ? (
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: daylio.color }}
          >
            <MoodFace kind={daylio.face} className="h-7 w-7" />
          </span>
        ) : (
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
            🙂
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg font-semibold leading-tight text-foreground">
            How are you?
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {daylio
              ? mood?.note
                ? mood.note
                : mood?.emotions?.length
                  ? `Feeling ${daylio.label} · ${mood.emotions.length} emotion${mood.emotions.length === 1 ? '' : 's'}`
                  : `Feeling ${daylio.label} · tap to add more`
              : "Tap to set today's mood"}
          </span>
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
    </>
  );
}
