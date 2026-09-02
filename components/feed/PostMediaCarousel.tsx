'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FeedMediaItem } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { cn } from '@/lib/utils';

type PostMediaCarouselProps = {
  items: FeedMediaItem[];
  alt: string;
  className?: string;
  slideClassName?: string;
  onTap?: () => void;
  onDoubleTap?: () => void;
  children?: ReactNode;
};

export function PostMediaCarousel({
  items,
  alt,
  className,
  slideClassName,
  onTap,
  onDoubleTap,
  children,
}: PostMediaCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const lastTap = useRef(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const [index, setIndex] = useState(0);
  const multi = items.length > 1;

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    const clamped = Math.min(items.length - 1, Math.max(0, next));
    if (clamped !== indexRef.current) {
      indexRef.current = clamped;
      setIndex(clamped);
    }
  }, [items.length]);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      const clamped = Math.min(items.length - 1, Math.max(0, next));
      indexRef.current = clamped;
      setIndex(clamped);
      el?.scrollTo({ left: clamped * (el.clientWidth || 0), behavior: 'smooth' });
    },
    [items.length]
  );

  const itemsKey = items.map((item) => `${item.url}:${item.mediaType || 'image'}`).join('|');

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [itemsKey]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onResize = () => {
      el.scrollTo({ left: indexRef.current * el.clientWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    root.querySelectorAll('video').forEach((video, i) => {
      if (i !== index) video.pause();
    });
  }, [index]);

  const handlePointerDown = (event: React.PointerEvent) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) dragged.current = true;
  };

  const handlePointerUp = () => {
    pointerStart.current = null;
  };

  const handleActivate = () => {
    if (dragged.current) return;
    const now = Date.now();
    if (now - lastTap.current < 320) {
      onDoubleTap?.();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    if (!onTap) return;
    window.setTimeout(() => {
      if (lastTap.current === now) onTap();
    }, 280);
  };

  return (
    <div className={cn('relative overflow-hidden bg-neutral-950', className)}>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain select-none [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        onScroll={syncIndexFromScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {items.map((item, i) => {
          const url = resolveMediaUrl(item.url);
          const isVideo = (item.mediaType || 'image') === 'video';
          return (
            <div
              key={`${url}-${i}`}
              className={cn(
                'relative flex h-[min(72dvh,32rem)] w-full min-w-full shrink-0 snap-center snap-always items-center justify-center',
                slideClassName
              )}
            >
              {isVideo ? (
                <video
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    onDoubleTap?.();
                  }}
                />
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className="flex h-full w-full cursor-pointer items-center justify-center"
                  onClick={handleActivate}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleActivate();
                    }
                  }}
                  aria-label={multi ? `Photo ${i + 1} of ${items.length}` : 'Open photo'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={alt}
                    draggable={false}
                    className="pointer-events-none h-full w-full object-contain"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {multi ? (
        <>
          {index > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goTo(index - 1);
              }}
              className="absolute left-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          {index < items.length - 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goTo(index + 1);
              }}
              className="absolute right-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
          <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <span
                key={`dot-${i}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
                )}
              />
            ))}
          </div>
          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
            {index + 1}/{items.length}
          </span>
        </>
      ) : null}

      {children}
    </div>
  );
}
