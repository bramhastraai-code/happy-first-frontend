'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dailyMoodAPI, dailyMoodInvalidationKeys } from '@/lib/api/dailyMood';
import {
  DAILY_MOOD_OPTIONS,
  type DailyMoodValue,
  type DailyMoodView,
  moodExpiresInLabel,
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

export function DailyMoodPickerSheet({
  open,
  onClose,
  currentMood = null,
  profileId,
  onSaved,
}: DailyMoodPickerSheetProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<DailyMoodValue | ''>(currentMood?.mood ?? '');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setSelected(currentMood?.mood ?? '');
    setSuccessMessage('');
    setError('');
  }, [open, currentMood?.mood]);

  useOverlayHistory({ open, onClose, key: 'daily-mood-picker' });

  const invalidate = async () => {
    const keys = dailyMoodInvalidationKeys(profileId);
    await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
  };

  const saveMutation = useMutation({
    mutationFn: async (mood: DailyMoodValue) => {
      const res = await dailyMoodAPI.set(mood);
      return res.data.data;
    },
    onSuccess: async (mood) => {
      setSuccessMessage('Mood saved');
      onSaved?.(mood);
      await invalidate();
      window.setTimeout(() => onClose(), 500);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save mood';
      setError(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await dailyMoodAPI.remove();
      return null;
    },
    onSuccess: async () => {
      setSuccessMessage('Mood removed');
      onSaved?.(null);
      await invalidate();
      window.setTimeout(() => onClose(), 500);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not remove mood';
      setError(message);
    },
  });

  const busy = saveMutation.isPending || removeMutation.isPending;

  if (!mounted || !open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close mood picker"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Set daily mood"
        className="relative z-[1] w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-surface shadow-[var(--shadow-float)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Daily mood</p>
            <p className="text-xs text-muted-foreground">
              Visible to mutual followers for 24 hours
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(70vh,520px)] overflow-y-auto px-4 py-4 sm:px-5">
          {currentMood ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Current: {currentMood.emoji} {currentMood.label} ·{' '}
              {moodExpiresInLabel(currentMood.expiresAt)}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DAILY_MOOD_OPTIONS.map((option) => {
              const isSelected = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={busy}
                  onClick={() => setSelected(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors',
                    isSelected
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border bg-secondary/50 text-foreground hover:bg-secondary'
                  )}
                >
                  <span className="text-2xl" aria-hidden>
                    {option.emoji}
                  </span>
                  <span className="text-xs font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>

          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
              {successMessage}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3 sm:px-5">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !currentMood}
            onClick={() => removeMutation.mutate()}
          >
            {removeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Remove'
            )}
          </Button>
          <Button
            type="button"
            disabled={busy || !selected}
            onClick={() => {
              if (!selected) return;
              saveMutation.mutate(selected);
            }}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentMood ? (
              'Update'
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
