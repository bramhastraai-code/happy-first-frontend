'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SmilePlus } from 'lucide-react';
import { dailyMoodAPI, dailyMoodQueryKeys } from '@/lib/api/dailyMood';
import { DailyMoodPickerSheet } from '@/components/mood/DailyMoodPickerSheet';
import type { DailyMoodView } from '@/lib/utils/dailyMood';
import { isDailyMoodActive, moodExpiresInLabel } from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

interface ProfileDailyMoodProps {
  profileId: string;
  /** Mood from public profile API when viewing others (mutual follow only). */
  visibleMood?: DailyMoodView | null;
  isOwnProfile?: boolean;
  className?: string;
}

/**
 * Own profile: fetch + edit daily mood near avatar/name.
 * Others: read-only chip when API returned an active mutual-follow mood.
 */
export function ProfileDailyMood({
  profileId,
  visibleMood = null,
  isOwnProfile = false,
  className,
}: ProfileDailyMoodProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const ownQuery = useQuery({
    queryKey: dailyMoodQueryKeys.mine(profileId),
    enabled: isOwnProfile && Boolean(profileId),
    queryFn: async () => {
      const res = await dailyMoodAPI.getMine();
      return res.data.data;
    },
    staleTime: 30_000,
  });

  const mood = isOwnProfile ? ownQuery.data ?? null : visibleMood;
  const activeMood = isDailyMoodActive(mood) ? mood : null;

  if (!isOwnProfile) {
    if (!activeMood) return null;
    return (
      <div className={cn('inline-flex items-center gap-1.5', className)}>
        <span className="text-base" aria-hidden>
          {activeMood.emoji}
        </span>
        <span className="text-sm font-medium text-foreground">{activeMood.label}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={cn(
          'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors',
          activeMood
            ? 'border-primary/25 bg-primary-soft/60 hover:bg-primary-soft'
            : 'border-dashed border-border bg-secondary/40 hover:bg-secondary',
          className
        )}
      >
        {activeMood ? (
          <>
            <span className="text-lg leading-none" aria-hidden>
              {activeMood.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                {activeMood.label}
              </span>
              <span className="block text-[10px] text-muted-foreground">
                 Tap to change
              </span>
            </span>
          </>
        ) : (
          <>
            <SmilePlus className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">Set daily mood</span>
          </>
        )}
      </button>

      <DailyMoodPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentMood={activeMood}
        profileId={profileId}
        onSaved={() => {
          void ownQuery.refetch();
        }}
      />
    </>
  );
}
