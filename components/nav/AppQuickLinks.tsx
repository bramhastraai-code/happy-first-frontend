'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAppQuickLinks } from '@/lib/navigation/appRoutes';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface AppQuickLinksProps {
  className?: string;
  /** 1 = stacked list (best for mobile sidebars); 2 = two columns from sm breakpoint up */
  columns?: 1 | 2;
}

export function AppQuickLinks({ className, columns = 1 }: AppQuickLinksProps) {
  const pathname = usePathname();
  const links = getAppQuickLinks();

  return (
    <ul
      className={cn(
        'grid list-none gap-2 p-0',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        className
      )}
    >
      {links.map(({ href, label, description, icon: Icon }) => {
        const pathOnly = href.split('?')[0];
        const isActive = pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);

        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3.5 transition-colors',
                'hover:border-primary/25 hover:bg-accent/40 active:bg-accent/60',
                isActive && 'border-primary/35 bg-primary-soft/30'
              )}
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug text-foreground">{label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
              </span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary',
                  isActive && 'text-primary'
                )}
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
