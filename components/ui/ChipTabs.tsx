'use client';

import { cn } from '@/lib/utils';

interface ChipTab {
  id: string;
  label: string;
}

interface ChipTabsProps {
  tabs: ChipTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  /** Equal-width tabs on small screens; horizontal scroll on larger screens when many tabs */
  layout?: 'scroll' | 'balanced';
}

export function ChipTabs({ tabs, active, onChange, className, layout }: ChipTabsProps) {
  const resolvedLayout = layout ?? (tabs.length <= 4 ? 'balanced' : 'scroll');
  const balanced = resolvedLayout === 'balanced' && tabs.length <= 4;

  return (
    <div
      className={cn(
        balanced
          ? 'grid w-full gap-2 sm:flex sm:w-auto'
          : 'flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        balanced && tabs.length === 2 && 'grid-cols-2',
        balanced && tabs.length === 3 && 'grid-cols-3',
        balanced && tabs.length === 4 && 'grid-cols-2 sm:grid-cols-4',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'chip',
            balanced ? 'w-full justify-center sm:w-auto sm:shrink-0' : 'shrink-0',
            active === tab.id ? 'chip-active' : 'chip-inactive'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
