'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAppQuickLinks } from '@/lib/navigation/appRoutes';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface AppQuickLinksProps {
  className?: string;
  columns?: 1 | 2;
}

export function AppQuickLinks({ className, columns = 2 }: AppQuickLinksProps) {
  const pathname = usePathname();
  const links = getAppQuickLinks();

  return (
    <div
      className={cn(
        'grid gap-2',
        columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1',
        className
      )}
    >
      {links.map(({ href, label, description, icon: Icon }) => {
        const pathOnly = href.split('?')[0];
        const isActive = pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/30 hover:bg-accent/50',
              isActive && 'border-primary/40 bg-primary-soft/40'
            )}
          >
            <span
              className={cn(
                'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary',
                isActive && 'bg-primary text-primary-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{label}</span>
              <span className="block truncate text-xs text-muted-foreground">{description}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        );
      })}
    </div>
  );
}
