'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MissedLogDaysData } from '@/lib/api/dailyLog';

interface MissedDaysCardProps {
  data: MissedLogDaysData | null;
  className?: string;
}

export function MissedDaysCard({ data, className }: MissedDaysCardProps) {
  const [expanded, setExpanded] = useState(false);
  const count = data?.count ?? 0;

  if (!data || count === 0) {
    return null;
  }

  const dayLabel = count === 1 ? 'day' : 'days';
  const firstMissed = data.days[0];

  return (
    <section className={cn('px-0.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {count} missed {dayLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Last {data.withinDays} days
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs font-semibold text-primary"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <span className="inline-flex items-center gap-1">
              Hide
              <ChevronUp className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              Show
              <ChevronDown className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </div>

      {expanded ? (
        <ul className="mt-2 space-y-1">
          {data.days.map((day) => (
            <li key={day.date}>
              <Link
                href={`/previous-log?date=${day.date}`}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="font-medium text-foreground">{day.label}</span>
                <span className="text-xs font-semibold text-primary">Submit</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : firstMissed ? (
        <Link
          href={`/previous-log?date=${firstMissed.date}`}
          className="mt-1.5 inline-block text-xs font-semibold text-primary"
        >
          Start with {firstMissed.label}
        </Link>
      ) : null}
    </section>
  );
}
