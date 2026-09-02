'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';

/** Matches home DashboardHeader action buttons for consistency across pages. */
export const headerActionBtnClass =
  'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

/** Back chevron — no circle/border outline. */
export const headerBackBtnClass =
  'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

export const headerActionBtnDangerClass =
  'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30';

/** Sticky page header — stays at the top while the page scrolls. */
export const pageStickyHeaderClass =
  'sticky top-0 z-40 -mx-4 mb-5 -mt-[calc(1rem+env(safe-area-inset-top,0px))] border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-md sm:-mx-6 sm:px-6';

interface AppPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Extra line under the title (chips, status, etc.) */
  meta?: ReactNode;
  /** Right-side actions — only thing that should differ per page */
  actions?: ReactNode;
  /** Optional left leading (e.g. back). Defaults to profile avatar like home. */
  leading?: ReactNode;
  /** When false, hides the default profile avatar leading */
  showAvatar?: boolean;
  /** Link avatar to profile. `null` = not clickable. Default: own feed profile. */
  avatarHref?: string | null;
  /** `label` = home-style uppercase eyebrow; `plain` = normal subtitle */
  subtitleTone?: 'label' | 'plain';
  /** `end` = right of title; `below` = always under content; `stack` = under on mobile, right from md+ */
  actionsPlacement?: 'end' | 'below' | 'stack';
  /** Skip sticky chrome — parent owns the sticky header shell. */
  flush?: boolean;
  className?: string;
}

export function AppPageHeader({
  title,
  subtitle,
  meta,
  actions,
  leading,
  showAvatar = true,
  avatarHref,
  subtitleTone = 'label',
  actionsPlacement = 'end',
  flush = false,
  className,
}: AppPageHeaderProps) {
  const { selectedProfile, user } = useAuthStore();
  const displayName = selectedProfile?.name || user?.name || 'You';
  const resolvedAvatarHref =
    avatarHref === null
      ? null
      : typeof avatarHref === 'string'
        ? avatarHref
        : selectedProfile?._id
          ? `/feed/profile/${selectedProfile._id}`
          : null;

  const avatar = showAvatar ? (
    resolvedAvatarHref ? (
      <Link
        href={resolvedAvatarHref}
        aria-label="Your profile"
        title={displayName}
        className="shrink-0 rounded-2xl transition-transform hover:scale-[1.02]"
      >
        <ProfileAvatar
          name={displayName}
          avatarUrl={selectedProfile?.avatarUrl}
          avatarSeed={selectedProfile?.avatarSeed}
          avatarStyle={selectedProfile?.avatarStyle}
          size="lg"
          rounded="2xl"
          className="shadow-sm sm:h-12 sm:w-12 sm:text-lg"
        />
      </Link>
    ) : (
      <ProfileAvatar
        name={displayName}
        avatarUrl={selectedProfile?.avatarUrl}
        avatarSeed={selectedProfile?.avatarSeed}
        avatarStyle={selectedProfile?.avatarStyle}
        size="lg"
        rounded="2xl"
        className="shadow-sm sm:h-12 sm:w-12 sm:text-lg"
      />
    )
  ) : null;

  const titleBlock = (
    <div className="min-w-0 flex-1">
      {subtitle && subtitleTone === 'label' ? (
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
          {subtitle}
        </p>
      ) : null}
      <h1 className="line-clamp-2 break-words text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">
        {title}
      </h1>
      {subtitle && subtitleTone === 'plain' ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
          {subtitle}
        </p>
      ) : null}
      {meta ? (
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {meta}
        </div>
      ) : null}
    </div>
  );

  const actionsRow = actions ? (
    <div className="profile-switcher flex shrink-0 flex-nowrap items-center justify-end gap-0.5">
      {actions}
    </div>
  ) : null;

  return (
    <header
      className={cn(
        'welcome-banner overflow-visible',
        !flush && pageStickyHeaderClass,
        className
      )}
    >
      {actionsPlacement === 'stack' ? (
        <div className="flex min-w-0 flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            {leading ?? avatar}
            {titleBlock}
          </div>
          {actions ? (
            <div className="profile-switcher flex shrink-0 flex-nowrap items-center justify-end gap-0.5 border-t border-border pt-1.5 md:border-0 md:pt-0">
              {actions}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            {leading ?? avatar}
            {titleBlock}
            {actionsPlacement === 'end' ? actionsRow : null}
          </div>
          {actionsPlacement === 'below' ? (
            <div className="mt-2">{actionsRow}</div>
          ) : null}
        </>
      )}
    </header>
  );
}
