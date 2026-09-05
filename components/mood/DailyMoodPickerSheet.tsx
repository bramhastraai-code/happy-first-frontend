'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Loader2, X } from 'lucide-react';
import {
  dailyMoodAPI,
  dailyMoodInvalidationKeys,
  dailyMoodQueryKeys,
  type MoodCatalogItem,
} from '@/lib/api/dailyMood';
import { DailyMoodJournalStep } from '@/components/mood/DailyMoodJournalStep';
import { MoodFace } from '@/components/mood/MoodFace';
import {
  DAILY_MOOD_OPTIONS,
  DAYLIO_MOOD_OPTIONS,
  getDaylioMoodOption,
  getMoodJournalPrompt,
  hydrateMoodStickers,
  moodStickerStorageKey,
  MOOD_JOURNAL_EMOTIONS,
  MOOD_STICKER_COLORS,
  type DailyMoodView,
  type MoodEmotionSticker,
} from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';
import { useOverlayHistory } from '@/lib/hooks/useOverlayHistory';
import { Button } from '@/components/ui/button';

interface DailyMoodPickerSheetProps {
  open: boolean;
  onClose: () => void;
  currentMood?: DailyMoodView | null;
  profileId?: string;
  onSaved?: (mood: DailyMoodView | null) => void;
}

function moodCircleColor(moodId: string, index: number) {
  const daylio = DAYLIO_MOOD_OPTIONS.find((row) => row.value === moodId);
  if (daylio) return daylio.color;
  return MOOD_STICKER_COLORS[index % MOOD_STICKER_COLORS.length];
}

function readStoredStickers(profileId?: string): MoodEmotionSticker[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(moodStickerStorageKey(profileId));
    if (!raw) return [];
    return hydrateMoodStickers(JSON.parse(raw)).filter((row) => row.custom);
  } catch {
    return [];
  }
}

function writeStoredStickers(profileId: string | undefined, stickers: MoodEmotionSticker[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      moodStickerStorageKey(profileId),
      JSON.stringify(stickers.filter((row) => row.custom))
    );
  } catch {
    /* ignore quota */
  }
}

function mergeLibrary(
  customs: MoodEmotionSticker[],
  fromMood: MoodEmotionSticker[]
): MoodEmotionSticker[] {
  const byId = new Map<string, MoodEmotionSticker>();
  for (const row of MOOD_JOURNAL_EMOTIONS) byId.set(row.id, { ...row });
  for (const row of customs) byId.set(row.id, { ...row, custom: true });
  for (const row of fromMood) {
    const existing = byId.get(row.id);
    byId.set(row.id, {
      ...row,
      custom: existing?.custom || row.custom || !MOOD_JOURNAL_EMOTIONS.some((p) => p.id === row.id),
    });
  }
  return Array.from(byId.values());
}

function defaultCatalog(): MoodCatalogItem[] {
  return DAILY_MOOD_OPTIONS.map((row, index) => ({
    id: row.value,
    name: row.label,
    emoji: row.emoji,
    sortOrder: index,
  }));
}

export function DailyMoodPickerSheet({
  open,
  onClose,
  currentMood = null,
  profileId,
  onSaved,
}: DailyMoodPickerSheetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'mood' | 'journal'>('mood');
  const [selectedId, setSelectedId] = useState<string>(currentMood?.mood || '');
  const [library, setLibrary] = useState<MoodEmotionSticker[]>(MOOD_JOURNAL_EMOTIONS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const settingsQuery = useQuery({
    queryKey: dailyMoodQueryKeys.settings(profileId),
    enabled: Boolean(open && profileId),
    queryFn: async () => {
      const res = await dailyMoodAPI.getSettings();
      return res.data.data.moods;
    },
    staleTime: 60_000,
  });

  const catalog = useMemo(() => {
    if (settingsQuery.data?.length) return settingsQuery.data;
    return defaultCatalog();
  }, [settingsQuery.data]);

  const selectedMood = useMemo(
    () => catalog.find((row) => row.id === selectedId) || null,
    [catalog, selectedId]
  );

  useEffect(() => setMounted(true), []);

  const resetFromCurrent = () => {
    setStep('mood');
    setSelectedId(currentMood?.mood || '');
    const moodStickers = hydrateMoodStickers(currentMood?.emotions);
    setLibrary(mergeLibrary(readStoredStickers(profileId), moodStickers));
    setSelectedIds(moodStickers.map((row) => row.id));
    setError('');
  };

  useEffect(() => {
    if (!open) return;
    resetFromCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentMood?.mood, currentMood?.updatedAt, profileId]);

  useOverlayHistory({ open, onClose, key: 'daily-mood-picker' });

  const invalidate = async () => {
    const keys = dailyMoodInvalidationKeys(profileId);
    await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
  };

  const selectedStickers = useMemo(
    () => library.filter((row) => selectedIds.includes(row.id)),
    [library, selectedIds]
  );

  const persistLibrary = (next: MoodEmotionSticker[]) => {
    setLibrary(next);
    writeStoredStickers(profileId, next);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMood) throw new Error('Pick a mood first');
      const res = await dailyMoodAPI.save({
        mood: selectedMood.id,
        label: selectedMood.name,
        emoji: selectedMood.emoji,
        emotions: selectedStickers,
      });
      return res.data.data;
    },
    onSuccess: async (mood) => {
      onSaved?.(mood);
      await invalidate();
      window.setTimeout(() => onClose(), 280);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Could not save mood');
      setError(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await dailyMoodAPI.remove();
      return null;
    },
    onSuccess: async () => {
      onSaved?.(null);
      await invalidate();
      window.setTimeout(() => onClose(), 280);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not remove mood';
      setError(message);
    },
  });

  const busy = saveMutation.isPending || removeMutation.isPending;
  const journalPrompt = selectedMood
    ? getMoodJournalPrompt(selectedMood.id)
    : 'What have you been up to?';

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const goToMoodPage = () => {
    if (
      typeof window !== 'undefined' &&
      window.history.state?.__hfOverlay === 'daily-mood-picker'
    ) {
      window.history.replaceState({}, '');
    }
    onClose();
    router.push('/mood');
  };

  if (!mounted || !open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close mood picker"
        className="absolute inset-0 bg-black/45"
        onClick={handleClose}
      />

      {step === 'mood' ? (
        <div
          role="dialog"
          aria-label="How are you?"
          className={cn(
            'relative z-[1] w-full max-w-md overflow-hidden rounded-t-[1.75rem] bg-background px-5 pb-5 pt-4 shadow-[var(--shadow-float)]',
            'sm:mx-4 sm:rounded-[1.75rem] sm:px-6 sm:pb-6 sm:pt-5'
          )}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <h2 className="text-center font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            How are you?
          </h2>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Tap a mood, then pick emojis that fit today
          </p>

          <div className="mt-6">
            {settingsQuery.isLoading && !settingsQuery.data ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading your moods…
              </div>
            ) : (
              <div
                className={cn(
                  '-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1',
                  'snap-x snap-mandatory scroll-smooth',
                  '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                )}
              >
                <div
                  className="flex items-start"
                  style={{
                    width: `${(Math.max(catalog.length, 5) / 5) * 100}%`,
                  }}
                >
                  {catalog.map((mood, index) => {
                    const selected = selectedId === mood.id;
                    const color = moodCircleColor(mood.id, index);
                    const daylio = getDaylioMoodOption(mood.id);
                    return (
                      <button
                        key={mood.id}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setSelectedId(mood.id);
                          setError('');
                          setStep('journal');
                        }}
                        className="flex shrink-0 snap-start flex-col items-center gap-1.5 disabled:opacity-60"
                        style={{ width: `${100 / Math.max(catalog.length, 5)}%` }}
                      >
                        <span
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-full transition-transform sm:h-14 sm:w-14',
                            selected && 'scale-110 ring-2 ring-foreground/15 ring-offset-2'
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {daylio ? (
                            <MoodFace kind={daylio.face} className="h-8 w-8 sm:h-9 sm:w-9" />
                          ) : (
                            <span className="text-[1.65rem] leading-none sm:text-3xl" aria-hidden>
                              {mood.emoji}
                            </span>
                          )}
                        </span>
                        <span
                          className="max-w-full truncate px-0.5 text-[11px] font-medium capitalize leading-none sm:text-xs"
                          style={{ color }}
                        >
                          {mood.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            <Button
              type="button"
              variant="outline"
              className="relative z-10 h-11 w-full rounded-xl text-sm font-semibold"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToMoodPage();
              }}
            >
              Mood page
            </Button>
            {currentMood && !busy ? (
              <button
                type="button"
                className="w-full py-1.5 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => removeMutation.mutate()}
              >
                Remove mood
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          role="dialog"
          aria-label={journalPrompt}
          className="relative z-[1] flex h-dvh w-full max-w-lg flex-col overflow-hidden bg-background sm:h-[min(92dvh,760px)] sm:rounded-[1.5rem] sm:shadow-[var(--shadow-float)]"
        >
          <header className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] sm:gap-2 sm:px-3">
            <button
              type="button"
              onClick={() => setStep('mood')}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary"
              aria-label="Back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            {selectedMood ? (
              getDaylioMoodOption(selectedMood.id) ? (
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: moodCircleColor(
                      selectedMood.id,
                      catalog.findIndex((row) => row.id === selectedMood.id)
                    ),
                  }}
                >
                  <MoodFace
                    kind={getDaylioMoodOption(selectedMood.id)!.face}
                    className="h-5 w-5"
                  />
                </span>
              ) : (
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg leading-none"
                  style={{
                    backgroundColor: moodCircleColor(
                      selectedMood.id,
                      catalog.findIndex((row) => row.id === selectedMood.id)
                    ),
                  }}
                >
                  {selectedMood.emoji}
                </span>
              )
            ) : null}
            <h2 className="flex-1 text-center font-serif text-[15px] font-semibold leading-tight text-foreground sm:text-lg">
              {journalPrompt}
            </h2>
            <button
              type="button"
              disabled={busy || !selectedMood}
              onClick={() => saveMutation.mutate()}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1 px-1.5 text-sm font-semibold text-primary disabled:opacity-50"
              aria-label="Save"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              <span className="hidden sm:inline">Save</span>
            </button>
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <DailyMoodJournalStep
              library={library}
              selectedIds={selectedIds}
              busy={busy}
              error={error}
              onToggle={(id) => {
                setSelectedIds((prev) =>
                  prev.includes(id)
                    ? prev.filter((item) => item !== id)
                    : prev.length >= 8
                      ? prev
                      : [...prev, id]
                );
              }}
              onUpsertCustom={(sticker) => {
                persistLibrary(
                  library.some((row) => row.id === sticker.id)
                    ? library.map((row) => (row.id === sticker.id ? sticker : row))
                    : [...library, sticker]
                );
                setSelectedIds((prev) =>
                  prev.includes(sticker.id) || prev.length >= 8 ? prev : [...prev, sticker.id]
                );
              }}
              onDeleteCustom={(id) => {
                persistLibrary(library.filter((row) => row.id !== id));
                setSelectedIds((prev) => prev.filter((item) => item !== id));
              }}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
