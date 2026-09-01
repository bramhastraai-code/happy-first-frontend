'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CommunityCreateFabProps {
  className?: string;
}

/** Fixed create-community FAB — visible even when user has memberships. */
export function CommunityCreateFab({ className }: CommunityCreateFabProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <Link
      href="/community/create"
      aria-label="Create community"
      className={cn(
        'community-create-btn fixed right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-float)] transition-transform active:scale-95',
        'bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] sm:right-8',
        className
      )}
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </Link>,
    document.body
  );
}
