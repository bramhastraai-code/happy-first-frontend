'use client';

import { ReactNode, RefObject, useEffect, useRef, useState } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PULL_THRESHOLD = 68;
const MAX_PULL = 100;
const RESISTANCE = 0.5;

interface PullToRefreshProps {
  /** Called once the user releases past the threshold. Awaited before snapping back. */
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
  className?: string;
  /** Applied to the inner wrapper that actually moves — use for e.g. a `space-y-*` list. */
  contentClassName?: string;
  /** Disable the gesture, e.g. while a fullscreen overlay is open. */
  disabled?: boolean;
  /** Use this element's scrollTop instead of the window's — for a panel with its own internal scroll. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

/** Custom-drawn pull-down-to-refresh — no native gesture to fight since the browser's own is blocked via preventDefault. */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  contentClassName,
  disabled,
  scrollContainerRef,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onRefreshRef = useRef(onRefresh);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const gesture = useRef({ startY: 0, pulling: false });

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    const getScrollTop = () =>
      scrollContainerRef?.current
        ? scrollContainerRef.current.scrollTop
        : document.scrollingElement?.scrollTop ?? window.scrollY ?? 0;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing || getScrollTop() > 0) {
        gesture.current.pulling = false;
        return;
      }
      gesture.current.startY = e.touches[0].clientY;
      gesture.current.pulling = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!gesture.current.pulling || refreshing) return;
      const delta = e.touches[0].clientY - gesture.current.startY;
      if (delta <= 0) {
        setPullY(0);
        return;
      }
      if (getScrollTop() > 0) {
        gesture.current.pulling = false;
        setPullY(0);
        return;
      }
      // We're driving the gesture ourselves — stop the browser's own overscroll/refresh.
      e.preventDefault();
      setPullY(Math.min(MAX_PULL, delta * RESISTANCE));
    };

    const onTouchEnd = () => {
      if (!gesture.current.pulling) return;
      gesture.current.pulling = false;
      setPullY((current) => {
        if (current >= PULL_THRESHOLD) {
          setRefreshing(true);
          Promise.resolve(onRefreshRef.current())
            .catch(() => {})
            .finally(() => {
              setRefreshing(false);
              setPullY(0);
            });
          return PULL_THRESHOLD * 0.7;
        }
        return 0;
      });
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, refreshing, scrollContainerRef]);

  const progress = Math.min(1, pullY / PULL_THRESHOLD);
  const settling = pullY === 0 || refreshing;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden"
        style={{
          height: pullY,
          opacity: progress > 0.08 || refreshing ? 1 : 0,
          transition: settling ? 'height 0.2s ease, opacity 0.2s ease' : undefined,
        }}
      >
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-[var(--shadow-card)]">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className={cn('h-4 w-4 transition-transform', progress >= 1 && 'text-primary')}
              style={{ transform: `rotate(${progress * 180}deg)` }}
            />
          )}
        </div>
      </div>
      <div
        className={contentClassName}
        style={{
          transform: `translateY(${pullY}px)`,
          transition: settling ? 'transform 0.2s ease' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
