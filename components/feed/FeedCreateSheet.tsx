'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, ImageIcon, Loader2, Plus, Upload, Video, X } from 'lucide-react';
import { feedAPI } from '@/lib/api/feed';
import { compressImageForUpload } from '@/lib/utils/compressImage';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CreateKind = 'post' | 'story';
type PickMode = 'image' | 'video' | 'camera' | 'drop';

type PendingMedia = {
  id: string;
  blob: Blob;
  previewUrl: string;
  mediaType: 'image' | 'video';
};

interface FeedCreateSheetProps {
  open: boolean;
  onClose: () => void;
  defaultKind?: CreateKind;
  /** When set, posts are scoped to this community feed (posts only). */
  communityId?: string;
  onCreated?: () => void;
}

const MAX_POST_IMAGES = 10;

export function FeedCreateSheet({
  open,
  onClose,
  defaultKind = 'post',
  communityId,
  onCreated,
}: FeedCreateSheetProps) {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropInputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<CreateKind>(communityId ? 'post' : defaultKind);
  const [items, setItems] = useState<PendingMedia[]>([]);
  const [caption, setCaption] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (open) setKind(communityId ? 'post' : defaultKind);
  }, [open, defaultKind, communityId]);

  const clearItems = () => {
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
  };

  const resetAndClose = () => {
    clearItems();
    setCaption('');
    setLocalError(null);
    setDragOver(false);
    uploadMutation.reset();
    onClose();
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!items.length) throw new Error('Choose a photo or video first');
      const response = await feedAPI.createPost(
        items.map((item) => item.blob),
        { caption, kind: communityId ? 'post' : kind, communityId }
      );
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

  const processFiles = async (fileList: File[], mode: PickMode) => {
    if (!fileList.length) return;
    setLocalError(null);

    try {
      const incoming = [...fileList];
      const hasVideo = incoming.some(
        (file) => file.type.startsWith('video/') || mode === 'video'
      );
      const hasImage = incoming.some(
        (file) => file.type.startsWith('image/') || mode === 'image' || mode === 'camera'
      );

      if (kind === 'story' && incoming.length > 1) {
        throw new Error('Stories support only one photo or video');
      }
      if (hasVideo && hasImage && incoming.length > 1) {
        throw new Error('Choose either images or one video, not both');
      }
      if (hasVideo && incoming.length > 1) {
        throw new Error('Only one video is allowed');
      }

      const nextItems: PendingMedia[] = [];
      for (const file of incoming) {
        const isVideo = file.type.startsWith('video/') || mode === 'video';
        if (isVideo && file.size > 40 * 1024 * 1024) {
          throw new Error('Video must be under 40MB');
        }
        let blob: Blob = file;
        if (!isVideo) {
          blob = await compressImageForUpload(file);
        }
        nextItems.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          blob,
          previewUrl: URL.createObjectURL(blob),
          mediaType: isVideo ? 'video' : 'image',
        });
      }

      setItems((prev) => {
        const replacingVideo = nextItems.some((item) => item.mediaType === 'video');
        const existingHasVideo = prev.some((item) => item.mediaType === 'video');
        if (kind === 'story' || replacingVideo || existingHasVideo) {
          prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
          return nextItems.slice(0, 1);
        }

        const merged = [...prev, ...nextItems]
          .filter((item) => item.mediaType === 'image')
          .slice(0, MAX_POST_IMAGES);
        const keepIds = new Set(merged.map((item) => item.id));
        prev.forEach((item) => {
          if (!keepIds.has(item.id)) URL.revokeObjectURL(item.previewUrl);
        });
        nextItems.forEach((item) => {
          if (!keepIds.has(item.id)) URL.revokeObjectURL(item.previewUrl);
        });
        return merged;
      });

      if (kind === 'post' && !hasVideo) {
        // soft notice if user tried to exceed max
        const currentCount = items.filter((item) => item.mediaType === 'image').length;
        if (currentCount + nextItems.length > MAX_POST_IMAGES) {
          setLocalError(`Only the first ${MAX_POST_IMAGES} images were kept`);
        }
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Could not read that file');
    }
  };

  const handleFileList = (list: FileList | File[] | null | undefined, mode: PickMode) => {
    if (!list) return;
    void processFiles(Array.from(list), mode);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  if (!open) return null;

  const errorMessage =
    localError ||
    (uploadMutation.error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    (uploadMutation.error instanceof Error ? uploadMutation.error.message : null);

  const canAddMoreImages =
    kind === 'post' &&
    items.length > 0 &&
    items.every((item) => item.mediaType === 'image') &&
    items.length < MAX_POST_IMAGES;

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!uploadMutation.isPending) resetAndClose();
        }}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:mx-4 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {communityId ? 'Share with community' : 'Create'}
            </p>
            <p className="text-xs text-muted-foreground">
              {kind === 'post' ? 'Up to 10 photos, or 1 video' : 'One photo or video · 24h'}
            </p>
          </div>
          <button
            type="button"
            disabled={uploadMutation.isPending}
            onClick={resetAndClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          {!communityId ? (
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
              {(
                [
                  { id: 'post', label: 'Post' },
                  { id: 'story', label: 'Story (24h)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setKind(item.id);
                    if (item.id === 'story' && items.length > 1) {
                      setItems((prev) => {
                        prev.slice(1).forEach((media) => URL.revokeObjectURL(media.previewUrl));
                        return prev.slice(0, 1);
                      });
                    }
                  }}
                  className={cn(
                    'rounded-xl py-2.5 text-sm font-semibold transition-colors',
                    kind === item.id
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {items.length === 0 ? (
            <>
              <button
                type="button"
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  handleFileList(event.dataTransfer.files, 'drop');
                }}
                onClick={() => dropInputRef.current?.click()}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors',
                  dragOver
                    ? 'border-primary bg-primary-soft/60'
                    : 'border-border bg-secondary/40 hover:border-primary/50 hover:bg-secondary/70'
                )}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Drag & drop photo or video
                </span>
                <span className="text-xs text-muted-foreground">
                  or click to browse · images & MP4/MOV
                </span>
              </button>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-primary-soft/50 px-2 py-5 text-center transition-colors hover:bg-primary-soft"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Camera className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/80 px-2 py-5 text-center transition-colors hover:bg-secondary"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {kind === 'post' ? 'Photos' : 'Photo'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/80 px-2 py-5 text-center transition-colors hover:bg-secondary"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-primary shadow-sm">
                    <Video className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">Video</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div
                  className={cn(
                    'grid gap-2',
                    items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  )}
                >
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="relative overflow-hidden rounded-2xl border border-border bg-black"
                    >
                      {item.mediaType === 'video' ? (
                        <video
                          src={resolveMediaUrl(item.previewUrl)}
                          controls
                          playsInline
                          className="mx-auto max-h-64 w-full object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(item.previewUrl)}
                          alt="Preview"
                          className="mx-auto max-h-64 w-full object-contain"
                        />
                      )}
                      <button
                        type="button"
                        disabled={uploadMutation.isPending}
                        onClick={() => removeItem(item.id)}
                        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {canAddMoreImages ? (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Add more photos ({items.length}/{MAX_POST_IMAGES})
                  </button>
                ) : null}
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
                  onClick={clearItems}
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
          ref={dropInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime,video/webm,video/*"
          multiple={kind === 'post'}
          className="hidden"
          onChange={(event) => {
            handleFileList(event.target.files, 'drop');
            event.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            handleFileList(event.target.files, 'camera');
            event.target.value = '';
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple={kind === 'post'}
          className="hidden"
          onChange={(event) => {
            handleFileList(event.target.files, 'image');
            event.target.value = '';
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          className="hidden"
          onChange={(event) => {
            handleFileList(event.target.files, 'video');
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
