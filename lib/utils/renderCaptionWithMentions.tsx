import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type MentionPerson = {
  profileId?: string;
  name: string;
};

/**
 * Renders caption text with @mentions highlighted in primary (orange),
 * matching community chat mention styling.
 */
export function renderCaptionWithMentions(
  caption: string,
  options?: {
    collaborators?: MentionPerson[] | null;
    className?: string;
    mentionClassName?: string;
    /** Use span wrapper (for inline captions next to author name). */
    inline?: boolean;
  }
): ReactNode {
  const text = String(caption || '');
  if (!text) return null;

  const known = (options?.collaborators || [])
    .map((c) => ({
      profileId: c.profileId,
      name: String(c.name || '').trim(),
    }))
    .filter((c) => c.name)
    .sort((a, b) => b.name.length - a.name.length);

  // Match known collaborator names first, then generic @First Last / @Name tokens, then #hashtags
  const knownPattern = known.length
    ? known
        .map((c) => `@${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
        .join('|')
    : null;
  const genericPattern = '@[A-Z][a-zA-Z]*(?:\\s+[A-Z][a-zA-Z]*)*';
  const hashtagPattern = '#[\\p{L}0-9_]+';
  const pattern = knownPattern
    ? new RegExp(`(${knownPattern}|${genericPattern}|${hashtagPattern})`, 'gu')
    : new RegExp(`(${genericPattern}|${hashtagPattern})`, 'gu');

  const parts = text.split(pattern);
  const mentionClass =
    options?.mentionClassName || 'font-semibold text-primary hover:underline';

  const content = parts.map((part, index) => {
    if (!part) return null;
    const isHashtag = /^#[\p{L}0-9_]+$/u.test(part);
    if (isHashtag) {
      return (
        <Link
          key={`${index}-${part}`}
          href={`/feed/hashtag/${encodeURIComponent(part.slice(1).toLowerCase())}`}
          className={mentionClass}
          onClick={(event) => event.stopPropagation()}
        >
          {part}
        </Link>
      );
    }

    const isKnown = known.some(
      (c) => part.toLowerCase() === `@${c.name}`.toLowerCase()
    );
    const isGeneric = /^@[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*$/.test(part);
    if (!isKnown && !isGeneric) {
      return <span key={`${index}-${part}`}>{part}</span>;
    }

    const match = known.find(
      (c) => part.toLowerCase() === `@${c.name}`.toLowerCase()
    );
    if (match?.profileId) {
      return (
        <Link
          key={`${index}-${part}`}
          href={`/feed/profile/${match.profileId}`}
          className={mentionClass}
          onClick={(event) => event.stopPropagation()}
        >
          {part}
        </Link>
      );
    }

    return (
      <span key={`${index}-${part}`} className={mentionClass}>
        {part}
      </span>
    );
  });

  if (options?.inline) {
    return (
      <span
        className={cn('whitespace-pre-wrap break-words', options?.className)}
      >
        {content}
      </span>
    );
  }

  return (
    <p
      className={cn(
        'whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground',
        options?.className
      )}
    >
      {content}
    </p>
  );
}
