'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Loader2, X } from 'lucide-react';
import { dailyMoodAPI, dailyMoodInvalidationKeys } from '@/lib/api/dailyMood';
import { HowAreYouMoodRow } from '@/components/mood/HowAreYouMoodRow';
import { DailyMoodJournalStep } from '@/components/mood/DailyMoodJournalStep';
import { MoodFace } from '@/components/mood/MoodFace';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import {
  getDaylioMoodOption,
  mapToDaylioMood,
  type DailyMoodValue,
  type DailyMoodView,
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
  const [step, setStep] = useState<'mood' | 'journal'>('mood');
  const [selected, setSelected] = useState<DailyMoodValue | ''>(
    mapToDaylioMood(currentMood?.mood) ?? ''
  );
  const [emotions, setEmotions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [clearPhoto, setClearPhoto] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceDurationMs, setVoiceDurationMs] = useState<number | null>(null);
  const [clearVoice, setClearVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartedAt = useRef(0);
  const localPreviewRef = useRef<string | null>(null);
  const localVoiceRef = useRef<string | null>(null);

  useEffect(() => setMounted(true), []);

  const resetFromCurrent = () => {
    setStep('mood');
    setSelected(mapToDaylioMood(currentMood?.mood) ?? '');
    setEmotions(currentMood?.emotions || []);
    setNote(currentMood?.note || '');
    setPhotoBlob(null);
    setPhotoPreview(currentMood?.photo?.url ? resolveMediaUrl(currentMood.photo.url) : null);
    setClearPhoto(false);
    setVoiceBlob(null);
    setVoiceUrl(currentMood?.voice?.url ? resolveMediaUrl(currentMood.voice.url) : null);
    setVoiceDurationMs(currentMood?.voice?.durationMs ?? null);
    setClearVoice(false);
    setRecording(false);
    setError('');
  };

  useEffect(() => {
    if (!open) return;
    resetFromCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentMood?.mood, currentMood?.updatedAt]);

  useOverlayHistory({ open, onClose, key: 'daily-mood-picker' });

  const invalidate = async () => {
    const keys = dailyMoodInvalidationKeys(profileId);
    await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecorder = () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
        return;
      } catch {
        /* fall through and release the mic */
      }
    }
    stopStream();
  };

  useEffect(() => {
    if (open) return;
    stopRecorder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Pick a mood first');
      const res = await dailyMoodAPI.saveJournal({
        mood: selected,
        emotions,
        note,
        photo: photoBlob,
        photoName: photoBlob ? 'mood.jpg' : undefined,
        voice: voiceBlob,
        voiceName: voiceBlob
          ? voiceBlob.type.includes('mp4') || voiceBlob.type.includes('aac')
            ? 'mood-voice.m4a'
            : 'mood-voice.webm'
          : undefined,
        voiceDurationMs,
        clearPhoto,
        clearVoice,
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

  const handleClose = () => {
    if (busy) return;
    stopRecorder();
    onClose();
  };

  const startRecording = async () => {
    setError('');
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setError('Voice memos need a secure connection (HTTPS).');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot record audio.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('Voice memos are not supported in this browser.');
      return;
    }

    try {
      stopRecorder();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recordStartedAt.current = Date.now();
      rec.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      rec.onerror = () => {
        stopStream();
        setRecording(false);
        setError('Recording failed. Try again.');
      };
      rec.onstop = () => {
        stopStream();
        const blobType = rec.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        if (!blob.size) {
          setRecording(false);
          setError('No audio was captured. Try recording again.');
          return;
        }
        if (localVoiceRef.current) URL.revokeObjectURL(localVoiceRef.current);
        const url = URL.createObjectURL(blob);
        localVoiceRef.current = url;
        setVoiceBlob(blob);
        setVoiceUrl(url);
        setVoiceDurationMs(Date.now() - recordStartedAt.current);
        setClearVoice(false);
        setRecording(false);
      };
      recorderRef.current = rec;
      rec.start(250);
      setRecording(true);
    } catch (err) {
      stopStream();
      setRecording(false);
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Allow microphone access in your browser settings, then tap record again.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No microphone was found on this device.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('The microphone is in use by another app. Close it and try again.');
      } else {
        setError('Could not start recording. Check microphone access and try again.');
      }
    }
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
            Tap a face, then add what you&apos;ve been up to
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
          aria-label="What have you been up to?"
          className="relative z-[1] flex h-dvh w-full max-w-lg flex-col bg-background sm:h-[min(92dvh,760px)] sm:rounded-[1.5rem] sm:shadow-[var(--shadow-float)]"
        >
          <header className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))] sm:gap-2 sm:px-3">
            <button
              type="button"
              onClick={() => {
                stopRecorder();
                setStep('mood');
              }}
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
              What have you been up to?
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <DailyMoodJournalStep
              selectedEmotions={emotions}
              note={note}
              photoPreview={photoPreview}
              voiceUrl={voiceUrl}
              voiceDurationMs={voiceDurationMs}
              recording={recording}
              busy={busy}
              error={error}
              onToggleEmotion={(id) => {
                setEmotions((prev) =>
                  prev.includes(id)
                    ? prev.filter((item) => item !== id)
                    : prev.length >= 8
                      ? prev
                      : [...prev, id]
                );
              }}
              onNoteChange={setNote}
              onPickPhoto={async (file) => {
                try {
                  const blob = await compressImageForUpload(file);
                  if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
                  const url = URL.createObjectURL(blob);
                  localPreviewRef.current = url;
                  setPhotoBlob(blob);
                  setPhotoPreview(url);
                  setClearPhoto(false);
                } catch {
                  setError('Could not read that photo. Try another image.');
                }
              }}
              onClearPhoto={() => {
                if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
                localPreviewRef.current = null;
                setPhotoBlob(null);
                setPhotoPreview(null);
                setClearPhoto(true);
              }}
              onStartRecording={() => void startRecording()}
              onStopRecording={stopRecorder}
              onClearVoice={() => {
                stopRecorder();
                if (localVoiceRef.current) URL.revokeObjectURL(localVoiceRef.current);
                localVoiceRef.current = null;
                setVoiceBlob(null);
                setVoiceUrl(null);
                setVoiceDurationMs(null);
                setClearVoice(true);
              }}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
