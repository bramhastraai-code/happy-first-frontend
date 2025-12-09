'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <main className="max-w-screen-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
