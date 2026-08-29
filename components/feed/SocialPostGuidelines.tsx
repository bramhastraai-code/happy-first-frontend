'use client';

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const DOS = [
  'Share real happiness moments, wins, and encouragement.',
  'Be kind — celebrate others and keep comments constructive.',
  'Use @ to tag people you follow (with their consent).',
];

const DONTS = [
  'No hate, bullying, spam, or misleading content.',
  'No graphic, illegal, or unsafe material.',
  'Don’t post others’ private info without permission.',
];

/** Compact dos & don’ts note shown when creating a social post. */
export function SocialPostGuidelines({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(
    () => 'Keep it kind, real, and Happy First — tap for dos & don’ts.',
    []
  );

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-secondary/40 px-3 py-2.5',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-foreground">
            Posting guidelines
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{summary}</span>
        </span>
        <span className="text-[11px] font-medium text-primary">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open ? (
        <div className="mt-2 grid gap-2 border-t border-border pt-2 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-success">
              Do
            </p>
            <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
              {DOS.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
              Don&apos;t
            </p>
            <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
              {DONTS.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
