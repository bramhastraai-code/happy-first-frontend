'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
  /** Drop page top padding so a full-bleed cover can sit at the viewport edge. */
  flushTop?: boolean;
}

export default function MainLayout({
  children,
  hideBottomNav = false,
  flushTop = false,
}: MainLayoutProps) {
  return (
    <div className="min-h-dvh bg-background">
      <main className={cn('page-container', flushTop && 'page-container-flush-top')}>
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
