'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  expanded,
  onToggle,
  children,
  className,
  contentClassName,
  id,
}: CollapsibleSectionProps) {
  return (
    <Card id={id} className={cn('section-card overflow-hidden', className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/60 sm:px-5"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>
      {expanded && (
        <div className={cn('border-t border-border px-4 pb-4 pt-1 sm:px-5 sm:pb-5', contentClassName)}>
          {children}
        </div>
      )}
    </Card>
  );
}
