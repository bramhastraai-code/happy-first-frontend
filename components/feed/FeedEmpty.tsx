'use client';

interface FeedEmptyProps {
  onCreate?: () => void;
  /** Shorter copy for community feed tab */
  variant?: 'default' | 'community';
}

export function FeedEmpty({ onCreate, variant = 'default' }: FeedEmptyProps) {
  const isCommunity = variant === 'community';

  return (
    <div className="px-2 py-16 text-center sm:py-20">
      <p className="text-base font-semibold text-foreground">
        {isCommunity ? 'No posts yet' : 'Nothing here yet'}
      </p>
      {!isCommunity ? (
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
          Share a photo, video, or story.
        </p>
      ) : null}
      {onCreate ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm"
        >
          {isCommunity ? 'New post' : 'Create your first post'}
        </button>
      ) : null}
    </div>
  );
}
