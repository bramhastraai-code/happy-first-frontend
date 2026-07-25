'use client';

interface FeedEmptyProps {
  onCreate?: () => void;
}

export function FeedEmpty({ onCreate }: FeedEmptyProps) {
  return (
    <div className="px-2 py-16 text-center sm:py-20">
      <p className="text-base font-semibold text-foreground">Nothing here yet</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Tap + to share a photo, video, or story with the community.
      </p>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm"
        >
          Create your first post
        </button>
      )}
    </div>
  );
}
