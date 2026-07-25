'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, ImageIcon, Loader2, Plus, Video, X } from 'lucide-react';
import { feedAPI } from '@/lib/api/feed';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CreateKind = 'post' | 'story';
type PickMode = 'image' | 'video' | 'camera';

interface FeedCreateSheetProps {
  open: boolean;
  onClose: () => void;
  defaultKind?: CreateKind;
  onCreated?: () => void;
}

export function FeedCreateSheet({
  open,
  onClose,
  defaultKind = 'post',
  onCreated,
}: FeedCreateSheetProps) {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<CreateKind>(defaultKind);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [pendingFile, setPendingFile] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setKind(defaultKind);
  }, [open, defaultKind]);

  const resetAndClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    setCaption('');
    setLocalError(null);
    setMediaType('image');
    uploadMutation.reset();
    onClose();
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!pendingFile) throw new Error('Choose a photo or video first');
      const response = await feedAPI.createPost(pendingFile, { caption, kind });
      return response.data.data.post;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['feedStories'] }),
      ]);
      onCreated?.();
      resetAndClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !uploadMutation.isPending) resetAndClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, uploadMutation.isPending]);

  const handleFile = async (file: File | undefined, mode: PickMode) => {
    if (!file) return;
    setLocalError(null);
    try {
      const isVideo = file.type.startsWith('video/') || mode === 'video';
      if (isVideo && file.size > 40 * 1024 * 1024) {
        throw new Error('Video must be under 40MB');
      }
      let next: Blob = file;
      if (!isVideo) {
        next = await compressImageForUpload(file);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setMediaType(isVideo ? 'video' : 'image');
      setPendingFile(next);
      setPreviewUrl(URL.createObjectURL(next));
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Could not read that file');
    }
  };

  if (!open) return null;

  const errorMessage =
    localError ||
    (uploadMutation.error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (uploadMutation.error instanceof Error ? uploadMutation.error.message : null);

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!uploadMutation.isPending) resetAndClose();
        }}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Create</p>
            <p className="text-xs text-muted-foreground">Story, photo, or video for the feed</p>
          </div>
          <button
            type="button"
            disabled={uploadMutation.isPending}
            onClick={resetAndClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            {([
              { id: 'post', label: 'Post' },
              { id: 'story', label: 'Story (24h)' },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                className={cn(
                  'rounded-xl py-2 text-sm font-semibold transition-colors',
                  kind === item.id
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {!previewUrl ? (
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-primary-soft/50 px-2 py-5 text-center hover:bg-primary-soft"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Camera className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-foreground">Camera</span>
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/80 px-2 py-5 text-center hover:bg-secondary"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                  <ImageIcon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-foreground">Photo</span>
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/80 px-2 py-5 text-center hover:bg-secondary"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                  <Video className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-foreground">Video</span>
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-border bg-black">
                {mediaType === 'video' ? (
                  <video
                    src={resolveMediaUrl(previewUrl)}
                    controls
                    playsInline
                    className="mx-auto max-h-72 w-full object-contain"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(previewUrl)}
                    alt="Preview"
                    className="mx-auto max-h-72 w-full object-contain"
                  />
                )}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Caption (optional)
                </span>
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={300}
                  placeholder={kind === 'story' ? 'Add to your story…' : 'Write a caption…'}
                  className="h-11 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setPendingFile(null);
                  }}
                >
                  Change
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sharing…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {kind === 'story' ? 'Share story' : 'Share post'}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0], 'camera');
            event.target.value = '';
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0], 'image');
            event.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0], 'video');
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
