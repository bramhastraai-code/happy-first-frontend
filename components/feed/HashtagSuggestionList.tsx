'use client';

import { Hash } from 'lucide-react';
import type { HashtagSummary } from '@/lib/api/hashtag';
import { cn } from '@/lib/utils';

interface HashtagSuggestionListProps {
  hashtags: HashtagSummary[];
  onSelect: (hashtag: HashtagSummary) => void;
  /**
   * 'above'/'below' float the list with `position: absolute`, which gets
   * clipped by any scrollable ancestor (e.g. a modal's `overflow-y-auto`
   * body) once the list would extend past that ancestor's current content
   * height. 'inline' instead renders the list as a normal block right after
   * the input, so it always stays fully visible and scrolls with the modal —
   * use this inside any scrollable dialog.
   */
  placement?: 'above' | 'below' | 'inline';
  className?: string;
}

function formatPostCount(count: number) {
  if (count <= 0) return 'New hashtag';
  if (count < 1000) return `${count} post${count === 1 ? '' : 's'}`;
  return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k posts`;
}

export function HashtagSuggestionList({
  hashtags,
  onSelect,
  placement = 'above',
  className,
}: HashtagSuggestionListProps) {
  if (!hashtags.length) return null;

  return (
    <ul
      className={cn(
        'z-20 max-h-56 overflow-y-auto border border-[#dbdbdb] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] [scrollbar-width:thin]',
        placement === 'above'
          ? 'absolute bottom-full left-0 right-0 mb-1 rounded-none'
          : placement === 'below'
            ? 'absolute left-0 right-0 top-full mt-1 rounded-none'
            : 'relative mt-1 rounded-xl',
        className
      )}
    >
      {hashtags.map((hashtag) => (
        <li key={hashtag.id} className="border-b border-[#efefef] last:border-b-0">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 active:bg-neutral-100"
            onClick={() => onSelect(hashtag)}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
              <Hash className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight text-[#262626]">
                #{hashtag.name}
              </span>
              <span className="mt-0.5 block truncate text-xs leading-tight text-[#737373]">
                {formatPostCount(hashtag.postCount)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
