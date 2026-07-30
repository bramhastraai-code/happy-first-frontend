'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedStory } from '@/lib/api/feed';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

function firstName(name: string) {
  return name.split(/\s+/).filter(Boolean)[0] || name;
}

interface FeedStoriesProps {
  stories: FeedStory[];
  onSelect?: (story: FeedStory, index: number) => void;
  onAddStory?: () => void;
  onOpenOwnStory?: () => void;
  ownStory?: FeedStory | null;
  className?: string;
}

function StoryRingAvatar({
  story,
  showAddBadge,
  onAddStory,
}: {
  story: FeedStory;
  showAddBadge?: boolean;
  onAddStory?: () => void;
}) {
  return (
    <span className="relative overflow-visible rounded-[1.35rem] bg-gradient-to-tr from-primary via-orange-400 to-amber-300 p-[2px]">
      <span className="relative block overflow-hidden rounded-[1.2rem] bg-surface p-[2px]">
        <ProfileAvatar
          name={story.name}
          avatarUrl={story.avatarUrl}
          avatarSeed={story.avatarSeed}
          avatarStyle={story.avatarStyle}
          size="lg"
          rounded="2xl"
          className="h-[3.85rem] w-[3.85rem] rounded-[1.05rem] text-lg"
        />
      </span>
      <span
        aria-hidden
        className="absolute right-[3px] top-[1px] z-10 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
      />
      {showAddBadge && onAddStory ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onAddStory();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onAddStory();
            }
          }}
          className="absolute -bottom-0.5 -right-0.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground"
          aria-label="Add story"
        >
          <Plus className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </span>
  );
}

export function FeedStories({
  stories,
  onSelect,
  onAddStory,
  onOpenOwnStory,
  ownStory,
  className,
}: FeedStoriesProps) {
  const otherStories = stories.filter(
    (story) => !ownStory || story.profileId !== ownStory.profileId
  );

  return (
    <div className={cn('feed-stories -mx-1 overflow-x-auto px-1 pt-1.5', className)}>
      <div className="flex gap-3.5 pb-1">
        {(onAddStory || ownStory) && (
          <button
            type="button"
            onClick={() => {
              if (ownStory && onOpenOwnStory) onOpenOwnStory();
              else onAddStory?.();
            }}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 overflow-visible"
          >
            {ownStory ? (
              <StoryRingAvatar story={ownStory} showAddBadge onAddStory={onAddStory} />
            ) : (
              <span className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-[1.35rem] border border-dashed border-border bg-secondary">
                <Plus className="h-5 w-5 text-primary" strokeWidth={2.5} />
              </span>
            )}
            <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
              Your story
            </span>
          </button>
        )}

        {otherStories.map((story, index) => (
          <button
            key={story.profileId}
            type="button"
            onClick={() => onSelect?.(story, index)}
            className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 overflow-visible"
          >
            <StoryRingAvatar story={story} />
            <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
              {firstName(story.name)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
