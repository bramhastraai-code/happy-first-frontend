'use client';

import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { resolveDefaultLanding } from '@/lib/theme/mascotTheme';
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
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Extra line under the title (chips, status, etc.) */
  meta?: ReactNode;
  /** Right-side actions — only thing that should differ per page */
  actions?: ReactNode;
  /** Optional left leading (e.g. back). Defaults to Happy First logo. */
  leading?: ReactNode;
  /** When false, hides the default Happy First logo */
  showAvatar?: boolean;
  /** Logo link. `null` = not clickable. Default: profile’s default landing. */
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
  const { selectedProfile } = useAuthStore();
  const defaultLanding = resolveDefaultLanding(selectedProfile?.preferences?.defaultLanding);
  const logoHref =
    avatarHref === null
      ? ''
      : typeof avatarHref === 'string'
        ? avatarHref
        : defaultLanding;

  const logo = showAvatar ? (
    <BrandLogo href={logoHref} size="md" className="shrink-0" />
  ) : null;

  const titleBlock = (
    <div className="min-w-0 flex-1">
      {subtitle && subtitleTone === 'label' ? (
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
          {subtitle}
        </p>
      ) : null}
      {title ? (
        <h1 className="line-clamp-2 break-words text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">
          {title}
        </h1>
      ) : null}
      {subtitle && subtitleTone === 'plain' ? (
        <div
          className={cn(
            'min-w-0 text-xs text-muted-foreground sm:text-sm',
            title ? 'mt-0.5' : null
          )}
        >
          {subtitle}
        </div>
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
            {leading ?? logo}
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
            {leading ?? logo}
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
