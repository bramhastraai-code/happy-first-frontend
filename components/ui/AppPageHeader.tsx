'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';

/** Matches home DashboardHeader action buttons for consistency across pages. */
export const headerActionBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

/** Back chevron — no circle/border outline. */
export const headerBackBtnClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

export const headerActionBtnDangerClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-destructive transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30';

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
  /** `end` = right of title (default); `below` = full-width row under content */
  actionsPlacement?: 'end' | 'below';
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

  return (
    <header
      className={cn(
        'welcome-banner section-card mb-5 overflow-hidden p-3 sm:p-4',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {leading ?? avatar}

        <div className="min-w-0 flex-1 self-center">
          {subtitle && subtitleTone === 'label' ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
              {subtitle}
            </p>
          ) : null}
          <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
            {title}
          </h1>
          {subtitle && subtitleTone === 'plain' ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
              {subtitle}
            </p>
          ) : null}
          {meta ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">{meta}</div>
          ) : null}
        </div>

        {actions && actionsPlacement === 'end' ? (
          <div className="profile-switcher flex max-w-[14.5rem] shrink-0 flex-wrap items-center justify-end gap-1.5 self-start sm:max-w-none">
            {actions}
          </div>
        ) : null}
      </div>

      {actions && actionsPlacement === 'below' ? (
        <div className="profile-switcher mt-3 flex flex-wrap items-center justify-end gap-1.5">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
