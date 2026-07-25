'use client';

import { useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight, Eye, Loader2, MoreVertical, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeedStory } from '@/lib/api/feed';
import { feedAPI } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { useAuthStore } from '@/lib/store/authStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

interface StoryViewerProps {
  stories: FeedStory[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function StoryViewer({
  stories,
  startIndex,
  open,
  onClose,
  onDeleted,
}: StoryViewerProps) {
  const { selectedProfile, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  const group = stories[groupIndex];
  const isOwner =
    Boolean(group) &&
    (group.profileId === selectedProfile?._id || group.userId === user?._id);

  const items = useMemo(() => {
    if (!group) return [];
    if (group.items?.length) {
      return group.items.map((item) => ({
        id: String(item.id),
        imageUrl: item.imageUrl,
        mediaType: item.mediaType || 'image',
        caption: item.caption || '',
      }));
    }
    return [
      {
        id: String(group.latestPhotoId),
        imageUrl: group.imageUrl,
        mediaType: group.mediaType || 'image',
        caption: '',
      },
    ];
  }, [group]);

  const current = items[itemIndex];

  const viewersQuery = useQuery({
    queryKey: ['storyViews', current?.id],
    enabled: open && isOwner && !!current?.id && viewersOpen,
    queryFn: async () => {
      const res = await feedAPI.getStoryViews(current!.id);
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const id = String(storyId || '').trim();
      if (!/^[a-fA-F0-9]{24}$/.test(id)) {
        throw new Error('Invalid story id');
      }
      return feedAPI.deletePost(id);
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['feedStories'] });
      onDeleted?.();
      onClose();
    },
  });

  useEffect(() => {
    if (open) {
      setGroupIndex(startIndex);
      setItemIndex(0);
      setViewersOpen(false);
      setDeleteOpen(false);
      setViewCount(0);
    }
  }, [open, startIndex]);

  useEffect(() => {
    if (!open || !current?.id) return;
    let cancelled = false;

    void feedAPI
      .recordStoryView(current.id)
      .then((res) => {
        if (cancelled) return;
        setViewCount(res.data.data.viewCount ?? 0);
      })
      .catch(() => {
        // ignore view errors for viewers
      });

    if (isOwner) {
      void feedAPI
        .getStoryViews(current.id)
        .then((res) => {
          if (!cancelled) setViewCount(res.data.data.viewCount ?? 0);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [open, current?.id, isOwner]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (deleteOpen) {
          setDeleteOpen(false);
          return;
        }
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        if (viewersOpen) setViewersOpen(false);
        else onClose();
      }
      if (deleteOpen || viewersOpen || menuOpen) return;
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupIndex, itemIndex, items.length, viewersOpen, deleteOpen, menuOpen]);

  const goNext = () => {
    setViewersOpen(false);
    setMenuOpen(false);
    if (itemIndex < items.length - 1) {
      setItemIndex((value) => value + 1);
      return;
    }
    if (groupIndex < stories.length - 1) {
      setGroupIndex((value) => value + 1);
      setItemIndex(0);
      return;
    }
    onClose();
  };

  const goPrev = () => {
    setViewersOpen(false);
    setMenuOpen(false);
    if (itemIndex > 0) {
      setItemIndex((value) => value - 1);
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = stories[groupIndex - 1];
      const prevCount = prevGroup.items?.length || 1;
      setGroupIndex((value) => value - 1);
      setItemIndex(Math.max(0, prevCount - 1));
    }
  };

  if (!open || !group || !current) return null;

  return (
    <div className="fixed inset-0 z-[230] bg-black">
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        {items.map((item, index) => (
          <span
            key={item.id}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
          >
            <span
              className={`block h-full bg-white transition-all ${
                index < itemIndex ? 'w-full' : index === itemIndex ? 'w-full' : 'w-0'
              }`}
            />
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 top-[calc(1.5rem+env(safe-area-inset-top,0px))] z-20 flex items-center gap-2 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {group.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{group.name}</p>
            {isOwner ? (
              <p className="text-[11px] text-white/70">Your story</p>
            ) : null}
          </div>
        </div>

        {isOwner ? (
          <div className="relative z-30">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((value) => !value);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label="Story options"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10"
                  aria-label="Close menu"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-11 z-20 min-w-[9.5rem] overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black/10">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Delete story
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="relative z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          aria-label="Close story"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        className="absolute inset-y-0 left-0 z-[5] w-1/3"
        onClick={goPrev}
        aria-label="Previous"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-[5] w-1/3"
        onClick={goNext}
        aria-label="Next"
      />

      <div className="flex h-full items-center justify-center px-2 pb-16 pt-20">
        {current.mediaType === 'video' ? (
          <video
            key={current.id}
            src={resolveMediaUrl(current.imageUrl)}
            autoPlay
            playsInline
            controls
            className="max-h-[78vh] max-w-full object-contain"
            onEnded={goNext}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveMediaUrl(current.imageUrl)}
            alt={current.caption || group.name}
            className="max-h-[78vh] max-w-full object-contain"
          />
        )}
      </div>

      {current.caption ? (
        <p className="absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 px-6 text-center text-sm text-white">
          {current.caption}
        </p>
      ) : null}

      {isOwner ? (
        <button
          type="button"
          onClick={() => setViewersOpen(true)}
          className="absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-20 mx-auto flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25"
        >
          <Eye className="h-4 w-4" />
          {viewCount} {viewCount === 1 ? 'view' : 'views'}
        </button>
      ) : null}

      <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
        <ChevronLeft className="h-6 w-6 text-white/40" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <ChevronRight className="h-6 w-6 text-white/40" />
      </div>

      {viewersOpen ? (
        <div className="absolute inset-x-0 bottom-0 z-30 flex max-h-[55vh] flex-col rounded-t-3xl bg-surface shadow-[var(--shadow-float)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Viewed by</p>
              <p className="text-xs text-muted-foreground">
                {viewCount} {viewCount === 1 ? 'person' : 'people'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewersOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground"
              aria-label="Close viewers"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {viewersQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (viewersQuery.data?.viewers?.length || 0) === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No views yet
              </p>
            ) : (
              <ul className="space-y-3">
                {viewersQuery.data!.viewers.map((viewer) => (
                  <li key={viewer.profileId} className="flex items-center gap-3">
                    <ProfileAvatar
                      name={viewer.name}
                      avatarUrl={viewer.avatarUrl}
                      avatarSeed={viewer.avatarSeed}
                      avatarStyle={viewer.avatarStyle}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {viewer.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {DateTime.fromISO(viewer.viewedAt).toRelative() || 'just now'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this story?"
        description="Are you sure you want to delete this story?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        zClassName="z-[280]"
        loading={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) setDeleteOpen(false);
        }}
        onConfirm={() => {
          if (current?.id) deleteMutation.mutate(String(current.id));
        }}
      />
    </div>
  );
}
