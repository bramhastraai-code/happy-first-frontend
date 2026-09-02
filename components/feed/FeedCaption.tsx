'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { renderCaptionWithMentions } from '@/lib/utils/renderCaptionWithMentions';
import { cn } from '@/lib/utils';

type MentionPerson = {
  profileId?: string;
  name: string;
};

interface FeedCaptionProps {
  caption: string;
  authorName: string;
  authorProfileId: string;
  collaborators?: MentionPerson[] | null;
  className?: string;
  textClassName?: string;
  mentionClassName?: string;
  /** Background behind the inline “more” so it covers the last words. */
  moreFadeClassName?: string;
}

export function FeedCaption({
  caption,
  authorName,
  authorProfileId,
  collaborators,
  className,
  textClassName,
  mentionClassName,
  moreFadeClassName,
}: FeedCaptionProps) {
  const text = String(caption || '').trim();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    if (expanded) return;
    measure();
  }, [text, authorName, expanded, measure]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, measure]);

  if (!text) return null;

  const showMore = !expanded && overflows;
  const showLess = expanded && overflows;

  return (
    <div className={cn('relative mt-1.5', className)}>
      <p
        ref={textRef}
        className={cn(
          'whitespace-pre-wrap break-words text-[13px] leading-snug text-foreground',
          !expanded && 'line-clamp-2',
          overflows && 'cursor-pointer',
          textClassName
        )}
        onClick={() => {
          if (!overflows) return;
          setExpanded((open) => !open);
        }}
      >
        <Link
          href={`/feed/profile/${authorProfileId}`}
          className="font-semibold text-inherit hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {authorName}
        </Link>{' '}
        {renderCaptionWithMentions(text, {
          collaborators,
          inline: true,
          mentionClassName:
            mentionClassName || 'font-semibold text-primary hover:underline',
        })}
        {showLess ? (
          <>
            {' '}
            <button
              type="button"
              className="text-[12px] font-normal text-muted-foreground"
              aria-label="Show less"
              onClick={(event) => {
                event.stopPropagation();
                setExpanded(false);
              }}
            >
              less
            </button>
          </>
        ) : null}
      </p>
      {showMore ? (
        <button
          type="button"
          className={cn(
            'absolute bottom-0 right-0 pl-1 text-[12px] leading-snug text-muted-foreground',
            moreFadeClassName
          )}
          aria-label="Read more"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(true);
          }}
        >
          more
        </button>
      ) : null}
    </div>
  );
}
