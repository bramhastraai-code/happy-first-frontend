'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityCategoryCollapseProps {
  emoji: string;
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function ActivityCategoryCollapse({
  emoji,
  label,
  count,
  defaultOpen = false,
  children,
}: ActivityCategoryCollapseProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-0.5 py-2 text-left"
      >
        <span className="text-sm" aria-hidden>
          {emoji}
        </span>
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h4>
        <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? children : null}
    </div>
  );
}
