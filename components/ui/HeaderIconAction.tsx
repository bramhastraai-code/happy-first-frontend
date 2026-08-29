'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const baseClass =
  'inline-flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 min-w-[3.25rem] min-h-11';

const dangerClass =
  'inline-flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-border px-1.5 py-1 text-destructive transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 min-w-[3.25rem] min-h-11';

interface HeaderIconActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  caption: string;
  danger?: boolean;
}

/** Header control with icon + visible caption (not icon-only). */
export function HeaderIconButton({
  icon,
  caption,
  danger,
  className,
  type = 'button',
  ...rest
}: HeaderIconActionProps) {
  return (
    <button
      type={type}
      className={cn(danger ? dangerClass : baseClass, className)}
      aria-label={caption}
      title={caption}
      {...rest}
    >
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>
      <span className="max-w-[4.5rem] truncate text-[9px] font-semibold leading-tight sm:text-[10px]">
        {caption}
      </span>
    </button>
  );
}

interface HeaderIconLinkProps {
  href: string;
  icon: ReactNode;
  caption: string;
  className?: string;
  danger?: boolean;
}

export function HeaderIconLink({
  href,
  icon,
  caption,
  className,
  danger,
}: HeaderIconLinkProps) {
  return (
    <Link
      href={href}
      className={cn(danger ? dangerClass : baseClass, className)}
      aria-label={caption}
      title={caption}
    >
      <span className="inline-flex h-[18px] w-[18px] items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>
      <span className="max-w-[4.5rem] truncate text-[9px] font-semibold leading-tight sm:text-[10px]">
        {caption}
      </span>
    </Link>
  );
}
