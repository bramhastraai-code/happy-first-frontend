'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { AppPageHeader, pageStickyHeaderClass } from '@/components/ui/AppPageHeader';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  dailyMoodAPI,
  dailyMoodInvalidationKeys,
  dailyMoodQueryKeys,
  type MoodCatalogItem,
  type MoodHistoryEntry,
} from '@/lib/api/dailyMood';
import { useAuthStore } from '@/lib/store/authStore';
import { MoodIconBadge } from '@/components/mood/MoodIconBadge';
import { DAILY_MOOD_OPTIONS, isDailyMoodActive } from '@/lib/utils/dailyMood';
import { resolveProfileTimezone } from '@/lib/utils/profileTime';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';

function formatWhen(iso?: string | null, zone?: string) {
  if (!iso) return '—';
  const dt = DateTime.fromISO(iso).setZone(zone || 'local');
  if (!dt.isValid) return '—';
  return dt.toFormat('ccc, d LLL · h:mm a');
}

function formatRelativeExpiry(iso?: string | null) {
  if (!iso) return '';
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return '';
  return dt.toRelative({ round: true }) || '';
}

export default function MoodPage() {
  const queryClient = useQueryClient();
  const { selectedProfile } = useAuthStore();
  const profileId = selectedProfile?._id;
  const zone = resolveProfileTimezone(selectedProfile?.timezone);

  const [monthCursor, setMonthCursor] = useState(() =>
    DateTime.now().setZone(zone).startOf('month')
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [draftMood, setDraftMood] = useState<MoodCatalogItem | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [draftPhoto, setDraftPhoto] = useState<File | null>(null);
  const [draftPreview, setDraftPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const moodQuery = useQuery({
    queryKey: dailyMoodQueryKeys.mine(profileId),
    enabled: Boolean(profileId),
    queryFn: async () => {
      const res = await dailyMoodAPI.getMine();
      return res.data.data;
    },
  });

  const settingsQuery = useQuery({
    queryKey: dailyMoodQueryKeys.settings(profileId),
    enabled: Boolean(profileId),
    queryFn: async () => {
      const res = await dailyMoodAPI.getSettings();
      return res.data.data.moods;
    },
  });

  const historyQuery = useQuery({
    queryKey: dailyMoodQueryKeys.history(profileId, monthCursor.month, monthCursor.year),
    enabled: Boolean(profileId),
    queryFn: async () => {
      const res = await dailyMoodAPI.getHistory({
        month: monthCursor.month,
        year: monthCursor.year,
      });
      return res.data.data;
    },
  });

  const catalog = useMemo(() => {
    if (settingsQuery.data?.length) return settingsQuery.data;
    return DAILY_MOOD_OPTIONS.map((row, index) => ({
      id: row.value,
      name: row.label,
      emoji: row.emoji,
      sortOrder: index,
    }));
  }, [settingsQuery.data]);

  const current = isDailyMoodActive(moodQuery.data) ? moodQuery.data : null;

  const invalidateAll = async () => {
    await Promise.all(
      dailyMoodInvalidationKeys(profileId).map((key) =>
        queryClient.invalidateQueries({ queryKey: [...key] })
      )
    );
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!draftMood) throw new Error('Pick a mood');
      return dailyMoodAPI.save({
        mood: draftMood.id,
        label: draftMood.name,
        emoji: draftMood.emoji,
        note: draftNote,
        photoFile: draftPhoto,
      });
    },
    onSuccess: async () => {
      setPickerOpen(false);
      setDraftMood(null);
      setDraftNote('');
      setDraftPhoto(null);
      setDraftPreview(null);
      setError(null);
      await invalidateAll();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save mood';
      setError(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => dailyMoodAPI.remove(),
    onSuccess: async () => {
      setRemoveConfirm(false);
      await invalidateAll();
    },
  });

  useEffect(() => {
    if (!draftPhoto) {
      setDraftPreview(null);
      return;
    }
    const url = URL.createObjectURL(draftPhoto);
    setDraftPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draftPhoto]);

  const dayMap = useMemo(() => {
    const map = new Map<string, { emoji: string; hasPhoto: boolean; mood?: string }>();

    for (const entry of historyQuery.data?.entries || []) {
      if (!entry.setAt) continue;
      const key = DateTime.fromISO(entry.setAt).setZone(zone).toFormat('yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, {
          emoji: entry.emoji,
          hasPhoto: Boolean(entry.photo?.url),
          mood: entry.mood,
        });
      }
    }

    for (const day of historyQuery.data?.days || []) {
      if (!map.has(day.date)) {
        map.set(day.date, { emoji: day.emoji, hasPhoto: day.hasPhoto });
      }
    }

    // Show active mood on the calendar even if history hasn't backfilled yet.
    if (current?.setAt && (current.emoji || current.mood)) {
      const dt = DateTime.fromISO(current.setAt).setZone(zone);
      if (
        dt.isValid &&
        dt.year === monthCursor.year &&
        dt.month === monthCursor.month
      ) {
        const key = dt.toFormat('yyyy-MM-dd');
        if (!map.has(key)) {
          map.set(key, {
            emoji: current.emoji || '🙂',
            hasPhoto: Boolean(current.photo?.url),
            mood: current.mood,
          });
        }
      }
    }
    return map;
  }, [historyQuery.data?.days, historyQuery.data?.entries, current, monthCursor.month, monthCursor.year, zone]);

  const calendarCells = useMemo(() => {
    const start = monthCursor.startOf('month');
    const end = monthCursor.endOf('month');
    const pad = start.weekday === 7 ? 0 : start.weekday; // Sun-start calendar
    const days: Array<{ key: string; day: number; dateKey: string | null; inMonth: boolean }> = [];
    for (let i = 0; i < pad; i += 1) {
      days.push({ key: `pad-${i}`, day: 0, dateKey: null, inMonth: false });
    }
    for (let d = 1; d <= end.day; d += 1) {
      const dt = start.set({ day: d });
      days.push({
        key: dt.toISODate() || `${d}`,
        day: d,
        dateKey: dt.toISODate(),
        inMonth: true,
      });
    }
    return days;
  }, [monthCursor]);

  const filteredEntries = useMemo(() => {
    const entries = [...(historyQuery.data?.entries || [])];

    // Synthetic row for current mood when history is missing that snapshot.
    if (current?.setAt) {
      const alreadyThere = entries.some(
        (entry) =>
          entry.setAt &&
          Math.abs(
            DateTime.fromISO(entry.setAt).toMillis() -
              DateTime.fromISO(current.setAt!).toMillis()
          ) < 5000
      );
      if (!alreadyThere) {
        const dt = DateTime.fromISO(current.setAt).setZone(zone);
        const inViewedMonth =
          dt.isValid && dt.year === monthCursor.year && dt.month === monthCursor.month;
        if (inViewedMonth) {
          entries.unshift({
            id: `current-${current.setAt}`,
            mood: current.mood,
            label: current.label || current.mood,
            emoji: current.emoji || '🙂',
            note: current.note || '',
            photo: current.photo || null,
            setAt: current.setAt,
            expiresAt: current.expiresAt || null,
            createdAt: current.setAt,
          } satisfies MoodHistoryEntry);
        }
      }
    }

    if (!selectedDate) return entries;
    return entries.filter((entry) => {
      if (!entry.setAt) return false;
      return DateTime.fromISO(entry.setAt).setZone(zone).toFormat('yyyy-MM-dd') === selectedDate;
    });
  }, [
    historyQuery.data?.entries,
    selectedDate,
    zone,
    current,
    monthCursor.month,
    monthCursor.year,
  ]);

  const openPicker = (prefill?: MoodCatalogItem | null) => {
    setError(null);
    setDraftMood(prefill || null);
    setDraftNote('');
    setDraftPhoto(null);
    setDraftPreview(null);
    setPickerOpen(true);
  };

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-lg space-y-4 pb-28 sm:max-w-2xl">
        <AppPageHeader
          className={pageStickyHeaderClass}
          title="Mood"
          subtitle="How you're feeling right now"
          subtitleTone="plain"
          actions={
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Mood settings"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          }
        />

        {/* Current mood */}
        <section className="section-card space-y-3 p-4 sm:p-5">
          {moodQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading mood…
            </div>
          ) : current ? (
            <>
              <div className="flex items-start gap-3">
                <MoodIconBadge mood={current.mood} emoji={current.emoji} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-foreground">{current.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Set {formatWhen(current.setAt || current.updatedAt, zone)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatWhen(current.expiresAt, zone)}
                    {formatRelativeExpiry(current.expiresAt)
                      ? ` · ${formatRelativeExpiry(current.expiresAt)}`
                      : ''}
                  </p>
                </div>
              </div>
              {current.note ? (
                <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm text-foreground">
                  {current.note}
                </p>
              ) : null}
              {current.photo?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(current.photo.url) || current.photo.url}
                  alt="Mood photo"
                  className="max-h-64 w-full rounded-2xl object-cover"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => openPicker()} className="flex-1 sm:flex-none">
                  Change mood
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRemoveConfirm(true)}
                  className="flex-1 sm:flex-none"
                >
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3 py-2 text-center">
              <p className="text-4xl" aria-hidden>
                🙂
              </p>
              <p className="text-sm font-semibold text-foreground">No active mood</p>
              <p className="text-xs text-muted-foreground">
                Set how you feel — it stays visible to mutual followers for 24 hours.
              </p>
              <Button type="button" onClick={() => openPicker()} className="w-full sm:w-auto">
                Set mood
              </Button>
            </div>
          )}
        </section>

        {/* History calendar */}
        <section className="section-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonthCursor((m) => m.minus({ months: 1 }))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {monthCursor.toFormat('LLLL yyyy')}
              </p>
              <p className="text-[11px] text-muted-foreground">Your mood history</p>
            </div>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonthCursor((m) => m.plus({ months: 1 }))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-1 pt-3 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 px-3 pb-3">
            {calendarCells.map((cell) => {
              if (!cell.inMonth || !cell.dateKey) {
                return <div key={cell.key} className="aspect-square" />;
              }
              const meta = dayMap.get(cell.dateKey);
              const isSelected = selectedDate === cell.dateKey;
              const isToday =
                cell.dateKey === DateTime.now().setZone(zone).toFormat('yyyy-MM-dd');
              return (
                <button
                  key={cell.key}
                  type="button"
                  title={meta ? `${cell.day}` : undefined}
                  onClick={() =>
                    setSelectedDate((prev) => (prev === cell.dateKey ? null : cell.dateKey))
                  }
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-xs transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                        ? 'bg-primary-soft text-primary'
                        : meta
                          ? 'bg-secondary/60 hover:bg-secondary'
                          : 'hover:bg-secondary'
                  )}
                >
                  <span
                    className={cn(
                      'tabular-nums leading-none',
                      meta ? 'text-[9px] font-medium opacity-70' : 'text-xs font-semibold'
                    )}
                  >
                    {cell.day}
                  </span>
                  {meta ? (
                    <MoodIconBadge
                      mood={meta.mood}
                      emoji={meta.emoji}
                      size="xs"
                      className="mt-0.5"
                    />
                  ) : null}
                  {meta?.hasPhoto ? (
                    <span
                      className={cn(
                        'absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full',
                        isSelected ? 'bg-primary-foreground' : 'bg-primary'
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {selectedDate ? (
            <div className="border-t border-border px-4 py-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear date filter ({selectedDate})
              </button>
            </div>
          ) : null}
        </section>

        {/* Chronological entries */}
        <section className="space-y-2">
          <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {selectedDate ? 'Entries for this day' : 'This month'}
          </p>
          {historyQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading history…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="section-card px-4 py-10 text-center text-sm text-muted-foreground">
              No mood entries yet this month.
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredEntries.map((entry) => (
                <MoodHistoryRow key={entry.id} entry={entry} zone={zone} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Set / change mood sheet */}
      {pickerOpen ? (
        <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/50"
            aria-label="Close"
            onClick={() => !saveMutation.isPending && setPickerOpen(false)}
          />
          <div className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-4 shadow-[var(--shadow-float)] sm:rounded-3xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {current ? 'Change mood' : 'Set mood'}
              </h2>
              <button
                type="button"
                onClick={() => !saveMutation.isPending && setPickerOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-5">
              {catalog.map((mood) => {
                const selected = draftMood?.id === mood.id;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setDraftMood(mood)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 text-center transition-colors',
                      selected
                        ? 'border-primary bg-primary-soft'
                        : 'border-border bg-background hover:border-primary/40'
                    )}
                  >
                    <span className="text-2xl leading-none">{mood.emoji}</span>
                    <span className="line-clamp-2 text-[10px] font-medium leading-tight text-foreground">
                      {mood.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Note <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              placeholder="What's on your mind?"
              className="mt-1.5 w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="mt-3 flex items-center gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setDraftPhoto(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => photoInputRef.current?.click()}
              >
                {draftPreview ? <Camera className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                {draftPreview ? 'Change photo' : 'Add photo'}
              </Button>
              {draftPreview ? (
                <button
                  type="button"
                  onClick={() => setDraftPhoto(null)}
                  className="text-xs font-semibold text-destructive hover:underline"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
            {draftPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draftPreview}
                alt="Preview"
                className="mt-3 max-h-48 w-full rounded-2xl object-cover"
              />
            ) : null}

            {error ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saveMutation.isPending}
                onClick={() => setPickerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!draftMood || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save mood'
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <MoodSettingsSheet
          moods={catalog}
          profileId={profileId}
          onClose={() => setSettingsOpen(false)}
          onSaved={async () => {
            await invalidateAll();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={removeConfirm}
        title="Remove current mood?"
        description="Your mood will disappear from Profile and Feed for mutual followers. Past history stays on this page."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        loading={removeMutation.isPending}
        onCancel={() => setRemoveConfirm(false)}
        onConfirm={() => removeMutation.mutate()}
      />
    </MainLayout>
  );
}

function MoodHistoryRow({ entry, zone }: { entry: MoodHistoryEntry; zone: string }) {
  const photoUrl = entry.photo?.url
    ? resolveMediaUrl(entry.photo.url) || entry.photo.url
    : null;
  return (
    <li className="section-card flex gap-3 p-3 sm:p-4">
      <MoodIconBadge mood={entry.mood} emoji={entry.emoji} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-foreground">{entry.label}</p>
          <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {entry.setAt
              ? DateTime.fromISO(entry.setAt).setZone(zone).toFormat('d LLL · h:mm a')
              : ''}
          </p>
        </div>
        {entry.note ? (
          <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
        ) : null}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className="mt-2 max-h-40 w-full rounded-xl object-cover"
          />
        ) : null}
      </div>
    </li>
  );
}

function MoodSettingsSheet({
  moods,
  profileId,
  onClose,
  onSaved,
}: {
  moods: MoodCatalogItem[];
  profileId?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [rows, setRows] = useState<MoodCatalogItem[]>(() =>
    moods.map((m, i) => ({ ...m, sortOrder: i }))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= rows.length) return;
    setRows((prev) => {
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy.map((row, i) => ({ ...row, sortOrder: i }));
    });
  };

  const save = async () => {
    if (rows.some((r) => !r.name.trim() || !r.emoji.trim())) {
      setError('Every mood needs a name and emoji');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await dailyMoodAPI.updateSettings(
        rows.map((row) => ({
          id: row.id,
          name: row.name.trim(),
          emoji: row.emoji.trim(),
        }))
      );
      await onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not save settings';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/50"
        aria-label="Close"
        onClick={() => !saving && onClose()}
      />
      <div className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-4 shadow-[var(--shadow-float)] sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Mood settings</h2>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Add, edit, delete, or reorder moods. Past history keeps the name and emoji from when
          you logged them.
        </p>

        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={`${row.id}-${index}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
            >
              <input
                value={row.emoji}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, emoji: e.target.value.slice(0, 8) } : r
                    )
                  )
                }
                className="h-10 w-12 rounded-lg border border-input bg-secondary text-center text-xl outline-none focus:ring-2 focus:ring-ring"
                aria-label="Emoji"
              />
              <input
                value={row.name}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === index ? { ...r, name: e.target.value.slice(0, 40) } : r
                    )
                  )
                }
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-secondary px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                aria-label="Mood name"
              />
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                </button>
                <button
                  type="button"
                  disabled={index === rows.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                </button>
              </div>
              <button
                type="button"
                disabled={rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 disabled:opacity-30"
                aria-label="Delete mood"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3 gap-1.5"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              {
                id: `custom-${Date.now().toString(36)}`,
                name: 'New mood',
                emoji: '🙂',
                sortOrder: prev.length,
              },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Add mood
        </Button>

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save settings'
            )}
          </Button>
        </div>
        {/* keep profileId referenced for future scoped keys */}
        <span className="sr-only">{profileId}</span>
      </div>
    </div>
  );
}
