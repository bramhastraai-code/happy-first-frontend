'use client';

import { Compass, Sparkles } from 'lucide-react';
import { DISCOVER_PAGE_CONTENT } from '@/lib/content/discoverContent';

/** Editorial intro on Community → Discover (content ready for Amit’s final copy). */
export function DiscoverPageIntro() {
  const c = DISCOVER_PAGE_CONTENT;
  return (
    <section
      aria-label="About Discover"
      className="section-card overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-surface p-4"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Compass className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {c.eyebrow}
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-foreground">{c.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.intro}</p>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {c.bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
            {c.tip}
          </p>
        </div>
      </div>
    </section>
  );
}
