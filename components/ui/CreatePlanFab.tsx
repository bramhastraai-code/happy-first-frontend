'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreatePlanFabProps {
  hidden?: boolean;
  className?: string;
}

/** Viewport-fixed Create Plan button — sits above the bottom nav. */
export default function CreatePlanFab({ hidden = false, className }: CreatePlanFabProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || hidden || typeof document === 'undefined') return null;

  return createPortal(
    <button
      type="button"
      onClick={() => router.push('/create-plan')}
      aria-label="Create plan"
      className={cn(
        'create-plan-fab fixed right-4 z-[60] flex items-center gap-2.5 rounded-full',
        'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
        'border border-primary/20 bg-primary py-2 pl-2 pr-4 text-primary-foreground',
        'shadow-[var(--shadow-float)] transition hover:bg-primary-hover',
        className
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
        <CalendarPlus className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="text-sm font-semibold">Create plan</span>
    </button>,
    document.body
  );
}
