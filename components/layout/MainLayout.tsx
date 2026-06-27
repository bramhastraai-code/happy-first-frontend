'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export default function MainLayout({ children, hideBottomNav = false }: MainLayoutProps) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <main className="page-container">{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
