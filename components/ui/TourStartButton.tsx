'use client';

import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TourStartButtonProps {
  onClick: () => void;
  className?: string;
}

export default function TourStartButton({ onClick, className }: TourStartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Start page tour"
      className={cn(
        'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex items-center gap-2.5 rounded-full',
        'border border-border bg-surface py-2 pl-2 pr-4 shadow-[var(--shadow-float)]',
        'transition-colors hover:bg-accent',
        className
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <HelpCircle className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="text-sm font-semibold text-foreground">Tour</span>
    </button>
  );
}
