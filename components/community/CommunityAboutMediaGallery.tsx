'use client';

import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import type { CommunityAboutMediaItem } from '@/lib/api/community';
import { cn } from '@/lib/utils';

interface CommunityAboutMediaGalleryProps {
  items: CommunityAboutMediaItem[];
  className?: string;
  /** Compact strip vs larger cards */
  size?: 'sm' | 'md';
}

export function CommunityAboutMediaGallery({
  items,
  className,
  size = 'md',
}: CommunityAboutMediaGalleryProps) {
  if (!items?.length) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Community highlights
      </p>
      <ul
        className={cn(
          'grid gap-2',
          items.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}
      >
        {items.map((item) => {
          const src = resolveMediaUrl(item.url) || item.url;
          const tall = size === 'md' ? 'min-h-[9rem]' : 'min-h-[6.5rem]';
          return (
            <li
              key={item.url}
              className={cn(
                'overflow-hidden rounded-xl border border-border bg-secondary/40',
                tall
              )}
            >
              {item.mediaType === 'video' ? (
                <video
                  src={src}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={item.caption || 'Community highlight'}
                  className="h-full w-full object-cover"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
