'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  icon: LucideIcon;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  /** Allow dropdowns/menus to extend outside the card (e.g. leaderboard filters). */
  overflowVisible?: boolean;
  /** `list` = Instagram settings row (no rounded card). */
  variant?: 'card' | 'list';
  /** Extra control beside the badge (e.g. Log shortcut). Clicks do not toggle. */
  actions?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  icon: Icon,
  expanded,
  onToggle,
  children,
  className,
  contentClassName,
  id,
  overflowVisible = false,
  variant = 'card',
  actions,
}: CollapsibleSectionProps) {
  const isList = variant === 'list';
  const header = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        'flex w-full items-center gap-3 text-left transition-colors',
        isList
          ? 'px-4 py-3.5 hover:bg-neutral-50'
          : 'px-4 py-3.5 hover:bg-accent/60 sm:px-5'
      )}
    >
      {isList ? (
        <Icon className="h-6 w-6 shrink-0 text-foreground" strokeWidth={1.75} />
      ) : (
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', isList ? 'text-foreground' : 'font-semibold text-foreground')}>
          {title}
        </p>
        {subtitle && (
          <p className={cn('truncate text-xs', isList ? 'text-neutral-400' : 'text-muted-foreground')}>
            {subtitle}
          </p>
        )}
      </div>
      {badge && (
        <span className="chip chip-active shrink-0 text-[10px]">{badge}</span>
      )}
      {actions ? (
        <span
          className="shrink-0"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </span>
      ) : null}
      <ChevronDown
        className={cn(
          'h-5 w-5 shrink-0 text-neutral-300 transition-transform duration-200',
          expanded && 'rotate-180'
        )}
      />
    </button>
  );

  const body = expanded ? (
    <div
      className={cn(
        isList ? 'border-t border-[#efefef] px-4 pb-4 pt-3' : 'border-t border-border px-4 pb-4 pt-1 sm:px-5 sm:pb-5',
        contentClassName
      )}
    >
      {children}
    </div>
  ) : null;

  if (isList) {
    return (
      <div id={id} className={cn(overflowVisible && 'overflow-visible', className)}>
        {header}
        {body}
      </div>
    );
  }

  return (
    <Card
      id={id}
      className={cn('section-card', overflowVisible && '!overflow-visible', !overflowVisible && 'overflow-hidden', className)}
    >
      {header}
      {body}
    </Card>
  );
}
