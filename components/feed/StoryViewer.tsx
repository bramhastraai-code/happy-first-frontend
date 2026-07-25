'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { FeedStory } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';

interface StoryViewerProps {
  stories: FeedStory[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
}

export function StoryViewer({ stories, startIndex, open, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [itemIndex, setItemIndex] = useState(0);

  const group = stories[groupIndex];
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
        id: group.latestPhotoId,
        imageUrl: group.imageUrl,
        mediaType: group.mediaType || 'image',
        caption: '',
      },
    ];
  }, [group]);

  const current = items[itemIndex];

  useEffect(() => {
    if (open) {
      setGroupIndex(startIndex);
      setItemIndex(0);
    }
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupIndex, itemIndex, items.length]);

  const goNext = () => {
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
      <div className="absolute inset-x-0 top-0 z-10 flex gap-1 px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
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

      <div className="absolute inset-x-0 top-[calc(1.5rem+env(safe-area-inset-top,0px))] z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {group.name.slice(0, 1).toUpperCase()}
          </span>
          <p className="text-sm font-semibold text-white">{group.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <button type="button" className="absolute inset-y-0 left-0 z-[5] w-1/3" onClick={goPrev} aria-label="Previous" />
      <button type="button" className="absolute inset-y-0 right-0 z-[5] w-1/3" onClick={goNext} aria-label="Next" />

      <div className="flex h-full items-center justify-center px-2">
        {current.mediaType === 'video' ? (
          <video
            key={current.id}
            src={resolveMediaUrl(current.imageUrl)}
            autoPlay
            playsInline
            controls
            className="max-h-[85vh] max-w-full object-contain"
            onEnded={goNext}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveMediaUrl(current.imageUrl)}
            alt={current.caption || group.name}
            className="max-h-[85vh] max-w-full object-contain"
          />
        )}
      </div>

      {current.caption ? (
        <p className="absolute inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-10 px-6 text-center text-sm text-white">
          {current.caption}
        </p>
      ) : null}

      <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center">
        <ChevronLeft className="h-6 w-6 text-white/40" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <ChevronRight className="h-6 w-6 text-white/40" />
      </div>
    </div>
  );
}
