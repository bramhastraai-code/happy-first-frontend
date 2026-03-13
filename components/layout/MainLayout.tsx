'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  hideBottomNav?: boolean;
}

export default function MainLayout({ children, hideBottomNav = false }: MainLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 ${hideBottomNav ? '' : 'pb-16'}`}>
      <main className="max-w-5xl mx-auto">
        {children}
      </main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
