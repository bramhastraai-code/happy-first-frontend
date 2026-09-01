'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <section
      className={cn(
        'rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 sm:p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
          <CalendarClock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Submit log for {count} missed {dayLabel}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Only the last {data.withinDays} days are shown here. Older pending logs are not listed.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-200 bg-background"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? (
            <>
              Hide dates
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show dates
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <ul className="mt-3 space-y-1.5 border-t border-amber-200/60 pt-3">
          {data.days.map((day) => (
            <li key={day.date}>
              <Link
                href={`/previous-log?date=${day.date}`}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-secondary/60"
              >
                <span className="font-medium text-foreground">{day.label}</span>
                <span className="text-xs font-semibold text-primary">Submit log</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!expanded && firstMissed && (
        <div className="mt-3">
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href={`/previous-log?date=${firstMissed.date}`}>
              Start with {firstMissed.label}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
