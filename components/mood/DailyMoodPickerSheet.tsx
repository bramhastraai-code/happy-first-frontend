'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Loader2, X } from 'lucide-react';
import { dailyMoodAPI, dailyMoodInvalidationKeys } from '@/lib/api/dailyMood';
import { HowAreYouMoodRow } from '@/components/mood/HowAreYouMoodRow';
import { DailyMoodJournalStep } from '@/components/mood/DailyMoodJournalStep';
import { MoodFace } from '@/components/mood/MoodFace';
import {
  getDaylioMoodOption,
  getMoodJournalPrompt,
  hydrateMoodStickers,
  mapToDaylioMood,
  moodStickerStorageKey,
  MOOD_JOURNAL_EMOTIONS,
  type DailyMoodValue,
  type DailyMoodView,
  type MoodEmotionSticker,
} from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';
import { useOverlayHistory } from '@/lib/hooks/useOverlayHistory';

interface DailyMoodPickerSheetProps {
  open: boolean;
  onClose: () => void;
  currentMood?: DailyMoodView | null;
  profileId?: string;
  onSaved?: (mood: DailyMoodView | null) => void;
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

export function DailyMoodPickerSheet({
  open,
  onClose,
  currentMood = null,
  profileId,
  onSaved,
}: DailyMoodPickerSheetProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'mood' | 'journal'>('mood');
  const [selected, setSelected] = useState<DailyMoodValue | ''>(
    mapToDaylioMood(currentMood?.mood) ?? ''
  );
  const [library, setLibrary] = useState<MoodEmotionSticker[]>(MOOD_JOURNAL_EMOTIONS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);

  const resetFromCurrent = () => {
    setStep('mood');
    setSelected(mapToDaylioMood(currentMood?.mood) ?? '');
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
      if (!selected) throw new Error('Pick a mood first');
      const res = await dailyMoodAPI.saveJournal({
        mood: selected,
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
  const daylio = getDaylioMoodOption(selected);
  const journalPrompt = getMoodJournalPrompt(selected);

  const handleClose = () => {
    if (busy) return;
    onClose();
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
            Tap a face, then pick emojis that fit today
          </p>

          <div className="mt-6">
            <HowAreYouMoodRow
              selected={selected}
              disabled={busy}
              onSelect={(value) => {
                setSelected(value);
                setError('');
                setStep('journal');
              }}
            />
          </div>

          {currentMood && !busy ? (
            <button
              type="button"
              className="mt-4 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => removeMutation.mutate()}
            >
              Remove mood
            </button>
          ) : null}
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
            {daylio ? (
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: daylio.color }}
              >
                <MoodFace kind={daylio.face} className="h-5 w-5" />
              </span>
            ) : null}
            <h2 className="flex-1 text-center font-serif text-[15px] font-semibold leading-tight text-foreground sm:text-lg">
              {journalPrompt}
            </h2>
            <button
              type="button"
              disabled={busy || !selected}
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
