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
  /** Path prefixes to hide (e.g. bottom-nav pages already reachable elsewhere) */
  exclude?: string[];
  /** `list` = Instagram settings rows (square, no card chrome). */
  variant?: 'cards' | 'list';
}

export function AppQuickLinks({ className, columns = 1, exclude = [], variant = 'cards' }: AppQuickLinksProps) {
  const pathname = usePathname();
  const links = getAppQuickLinks().filter((link) => {
    const pathOnly = link.href.split('?')[0];
    return !exclude.some(
      (path) => pathOnly === path || pathOnly.startsWith(`${path}/`)
    );
  });

  if (links.length === 0) return null;

  const isList = variant === 'list';

  return (
    <ul
      className={cn(
        'grid list-none p-0',
        isList ? 'gap-0' : 'gap-2',
        !isList && (columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'),
        className
      )}
    >
      {links.map(({ href, label, description, icon: Icon }) => {
        const pathOnly = href.split('?')[0];
        const isActive = pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);

        return (
          <li key={href} className={isList ? 'border-t border-[#efefef] first:border-t-0' : undefined}>
            <Link
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 transition-colors',
                isList
                  ? 'px-4 py-3.5 hover:bg-neutral-50'
                  : 'rounded-xl border border-border bg-surface px-3 py-3.5 hover:border-primary/25 hover:bg-accent/40 active:bg-accent/60',
                !isList && isActive && 'border-primary/35 bg-primary-soft/30'
              )}
            >
              {isList ? (
                <Icon className="h-6 w-6 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden />
              ) : (
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug text-foreground">{label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-neutral-400">{description}</span>
              </span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 text-neutral-300',
                  !isList && 'transition-transform group-hover:translate-x-0.5 group-hover:text-primary',
                  !isList && isActive && 'text-primary'
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
