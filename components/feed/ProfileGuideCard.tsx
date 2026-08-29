'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { PROFILE_PAGE_CONTENT } from '@/lib/content/profileGuideContent';
import { Button } from '@/components/ui/button';

interface ProfileGuideCardProps {
  /** Show edit CTA (own profile only) */
  showEditCta?: boolean;
  onEdit?: () => void;
}

/** Editorial intro on My Profile (content ready for Amit’s final copy). */
export function ProfileGuideCard({ showEditCta = false, onEdit }: ProfileGuideCardProps) {
  const c = PROFILE_PAGE_CONTENT;
  return (
    <section
      aria-label="About My Profile"
      className="rounded-2xl border border-border bg-gradient-to-br from-primary-soft/80 via-surface to-surface p-4"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <UserRound className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {c.eyebrow}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-foreground">{c.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.intro}</p>
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {c.bullets.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          {showEditCta ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {onEdit ? (
                <Button type="button" size="sm" onClick={onEdit}>
                  {c.ownCtaLabel}
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/settings">{c.ownCtaLabel}</Link>
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">{c.ownCtaHint}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
