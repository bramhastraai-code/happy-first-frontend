'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export default function MainLayout({ children, hideBottomNav = false }: MainLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 overflow-x-hidden ${hideBottomNav ? '' : 'pb-16'}`}>
      <main className="max-w-5xl mx-auto w-full px-2 sm:px-3">
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
