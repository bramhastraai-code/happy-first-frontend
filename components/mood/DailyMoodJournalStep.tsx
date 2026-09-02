'use client';

import { useRef } from 'react';
import {
  Angry,
  Camera,
  CloudLightning,
  CloudRain,
  Frown,
  HandHeart,
  Heart,
  HelpCircle,
  ImageIcon,
  Leaf,
  LifeBuoy,
  Loader2,
  Mic,
  Moon,
  PartyPopper,
  Sparkles,
  Square,
  Trees,
  X,
} from 'lucide-react';
import { MOOD_JOURNAL_EMOTIONS, type MoodJournalEmotionId } from '@/lib/utils/dailyMood';
import { cn } from '@/lib/utils';

const EMOTION_ICONS: Record<MoodJournalEmotionId, typeof Heart> = {
  happy: PartyPopper,
  excited: Sparkles,
  grateful: Heart,
  relaxed: Trees,
  content: HandHeart,
  tired: Moon,
  unsure: HelpCircle,
  bored: Leaf,
  anxious: CloudLightning,
  angry: Angry,
  stressed: CloudRain,
  sad: Frown,
  desperate: LifeBuoy,
};

interface DailyMoodJournalStepProps {
  selectedEmotions: string[];
  note: string;
  photoPreview: string | null;
  voiceUrl: string | null;
  voiceDurationMs: number | null;
  recording: boolean;
  busy: boolean;
  error: string;
  onToggleEmotion: (id: string) => void;
  onNoteChange: (value: string) => void;
  onPickPhoto: (file: File) => void;
  onClearPhoto: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearVoice: () => void;
}

export function DailyMoodJournalStep({
  selectedEmotions,
  note,
  photoPreview,
  voiceUrl,
  voiceDurationMs,
  recording,
  busy,
  error,
  onToggleEmotion,
  onNoteChange,
  onPickPhoto,
  onClearPhoto,
  onStartRecording,
  onStopRecording,
  onClearVoice,
}: DailyMoodJournalStepProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Emotions
          </p>
          <span className="text-[11px] text-muted-foreground">{selectedEmotions.length}/8</span>
        </div>
        <div className="grid grid-cols-5 gap-x-2 gap-y-4">
          {MOOD_JOURNAL_EMOTIONS.map((emotion) => {
            const Icon = EMOTION_ICONS[emotion.id];
            const active = selectedEmotions.includes(emotion.id);
            return (
              <button
                key={emotion.id}
                type="button"
                disabled={busy}
                onClick={() => onToggleEmotion(emotion.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    'inline-flex h-12 w-12 items-center justify-center rounded-full border transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-primary-soft/70 text-primary'
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="text-[11px] font-medium capitalize text-foreground">
                  {emotion.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Quick note</p>
          <span className="text-[11px] text-muted-foreground">{note.length}/500</span>
        </div>
        <textarea
          value={note}
          disabled={busy}
          maxLength={500}
          rows={3}
          placeholder="Add a note…"
          onChange={(event) => onNoteChange(event.target.value.slice(0, 500))}
          className="w-full resize-none rounded-none border border-[#dbdbdb] bg-[#fafafa] px-3 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold text-foreground">Photo</p>
        {photoPreview ? (
          <div className="relative overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Mood photo" className="max-h-56 w-full object-cover" />
            <button
              type="button"
              disabled={busy}
              onClick={onClearPhoto}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-none border border-border bg-secondary/60 text-sm font-medium text-foreground"
            >
              <Camera className="h-4 w-4 text-primary" />
              Take photo
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-none border border-border bg-secondary/60 text-sm font-medium text-foreground"
            >
              <ImageIcon className="h-4 w-4 text-primary" />
              From gallery
            </button>
          </div>
        )}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPickPhoto(file);
            event.target.value = '';
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPickPhoto(file);
            event.target.value = '';
          }}
        />
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold text-foreground">Voice memo</p>
        {voiceUrl && !recording ? (
          <div className="flex items-center gap-2 rounded-none border border-border bg-secondary/50 px-3 py-2">
            <audio src={voiceUrl} controls className="min-w-0 flex-1" />
            <button
              type="button"
              disabled={busy}
              onClick={onClearVoice}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={recording ? onStopRecording : onStartRecording}
            className="flex h-12 w-full items-center justify-between rounded-none border border-border bg-secondary/60 px-3 text-sm font-medium text-foreground"
          >
            <span>{recording ? 'Tap to stop' : 'Tap to record'}</span>
            <span
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full',
                recording ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground'
              )}
            >
              {recording ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </span>
          </button>
        )}
        {recording ? (
          <p className="mt-1 text-[11px] text-primary">Recording…</p>
        ) : voiceDurationMs ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {Math.max(1, Math.round(voiceDurationMs / 1000))}s
          </p>
        ) : null}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {busy ? (
        <div className="flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
}
