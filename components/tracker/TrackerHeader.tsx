'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackerHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
}

export default function TrackerHeader({
  title,
  subtitle,
  backHref = '/tracker',
  backLabel = 'Back',
  action,
  className,
}: TrackerHeaderProps) {
  return (
    <header className={cn('flex items-start gap-3', className)}>
      <Link
        href={backHref}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={backLabel}
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
