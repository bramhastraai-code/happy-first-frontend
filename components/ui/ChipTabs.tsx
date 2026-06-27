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
}

export function ChipTabs({ tabs, active, onChange, className }: ChipTabsProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'chip shrink-0',
            active === tab.id ? 'chip-active' : 'chip-inactive'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
