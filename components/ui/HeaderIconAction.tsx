'use client';

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const baseClass =
  'inline-flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 min-w-[3.25rem] min-h-11';

const dangerClass =
  'inline-flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1 text-destructive transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 min-w-[3.25rem] min-h-11';

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

export interface HeaderOverflowItem {
  id: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
}

interface HeaderOverflowMenuProps {
  items: HeaderOverflowItem[];
  caption?: string;
}

/** Collapses secondary header actions into a single More control. */
export function HeaderOverflowMenu({ items, caption = 'More' }: HeaderOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  const itemClass = (danger?: boolean) =>
    cn(
      'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors',
      danger
        ? 'text-destructive hover:bg-destructive/10'
        : 'text-foreground hover:bg-secondary',
      'disabled:pointer-events-none disabled:opacity-50'
    );

  return (
    <div className="relative" ref={rootRef}>
      <HeaderIconButton
        icon={<MoreHorizontal className="h-[18px] w-[18px]" />}
        caption={caption}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      />
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[var(--shadow-float)]"
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.id}
                href={item.href}
                role="menuitem"
                className={itemClass(item.danger)}
                onClick={() => setOpen(false)}
              >
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={itemClass(item.danger)}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-3.5 [&>svg]:w-3.5">
                  {item.icon}
                </span>
                {item.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
