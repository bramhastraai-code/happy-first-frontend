'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedStory } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';

function firstName(name: string) {
  return name.split(/\s+/).filter(Boolean)[0] || name;
}

interface FeedStoriesProps {
  stories: FeedStory[];
  onSelect?: (story: FeedStory, index: number) => void;
  onAddStory?: () => void;
  className?: string;
}

export function FeedStories({ stories, onSelect, onAddStory, className }: FeedStoriesProps) {
  return (
    <div className={cn('feed-stories -mx-1 overflow-x-auto px-1', className)}>
      <div className="flex gap-3.5 pb-1">
        {onAddStory && (
          <button
            type="button"
            onClick={onAddStory}
            className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.35rem] border border-dashed border-border bg-secondary">
              <Plus className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
              Your story
            </span>
          </button>
        )}

        {stories.map((story, index) => (
          <button
            key={story.profileId}
            type="button"
            onClick={() => onSelect?.(story, index)}
            className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative rounded-[1.35rem] bg-gradient-to-tr from-primary via-orange-400 to-amber-300 p-[2px]">
              <span className="block overflow-hidden rounded-[1.2rem] bg-surface p-[2px]">
                {story.mediaType === 'video' ? (
                  <video
                    src={resolveMediaUrl(story.imageUrl)}
                    muted
                    playsInline
                    className="h-[3.85rem] w-[3.85rem] rounded-[1.05rem] object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(story.imageUrl)}
                    alt={story.name}
                    className="h-[3.85rem] w-[3.85rem] rounded-[1.05rem] object-cover"
                    loading="lazy"
                  />
                )}
              </span>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
              {firstName(story.name)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
