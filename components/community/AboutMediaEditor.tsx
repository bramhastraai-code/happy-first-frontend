'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { communityAPI } from '@/lib/api/community';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';

const MAX_ABOUT_MEDIA = 8;

interface AboutMediaEditorProps {
  communityId: string;
}

/** Admin gallery of images/videos shown on Discover / About for visitors. */
export function AboutMediaEditor({ communityId }: AboutMediaEditorProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const communityQuery = useQuery({
    queryKey: ['community', communityId],
    enabled: Boolean(communityId),
    queryFn: async () => {
      const res = await communityAPI.get(communityId);
      return res.data.data.community;
    },
  });

  const items = communityQuery.data?.aboutMedia || [];

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => communityAPI.uploadAboutMedia(communityId, files),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({
        queryKey: ['community', communityId, 'discover-overview'],
      });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Upload failed'
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (url: string) => communityAPI.removeAboutMedia(communityId, url),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({
        queryKey: ['community', communityId, 'discover-overview'],
      });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not remove media'
      );
    },
  });

  const remaining = Math.max(0, MAX_ABOUT_MEDIA - items.length);
  const busy = uploadMutation.isPending || removeMutation.isPending;

  return (
    <div className="section-card space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">About gallery</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Images and videos shown while someone is learning about this community (Discover /
          About). Max {MAX_ABOUT_MEDIA}.
        </p>
      </div>

      {items.length ? (
        <ul className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const src = resolveMediaUrl(item.url) || item.url;
            return (
              <li
                key={item.url}
                className="relative overflow-hidden rounded-xl border border-border bg-secondary/40"
              >
                {item.mediaType === 'video' ? (
                  <video src={src} className="aspect-square w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/55 text-white disabled:opacity-50"
                  aria-label="Remove media"
                  onClick={() => removeMutation.mutate(item.url)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          No highlights yet — add photos or short videos for visitors.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []).slice(0, remaining);
          event.target.value = '';
          if (!files.length) return;
          uploadMutation.mutate(files);
        }}
      />

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy || remaining <= 0}
        onClick={() => inputRef.current?.click()}
      >
        {uploadMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        Add photos / videos
        {remaining < MAX_ABOUT_MEDIA ? ` (${remaining} left)` : ''}
      </Button>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
