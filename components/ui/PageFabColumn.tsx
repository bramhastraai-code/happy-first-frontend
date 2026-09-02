'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageFabColumnProps {
  children: ReactNode;
  className?: string;
}

/**
 * Stacks floating action buttons above the bottom nav.
 * First child sits closest to the nav; each next child stacks upward.
 */
export function PageFabColumn({ children, className }: PageFabColumnProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed right-4 z-[55] flex flex-col-reverse items-end gap-2.5',
        'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:right-8',
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

/** Shared circular FAB styling for page action buttons. */
export const pageFabCircleClass =
  'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-float)] transition-transform active:scale-95';
