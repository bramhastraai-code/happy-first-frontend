'use client';

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChipTabs } from '@/components/ui/ChipTabs';

const CATEGORY_ORDER = ['body', 'mind', 'soul'] as const;
const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  body: { label: 'Body', emoji: '💪' },
  mind: { label: 'Mind', emoji: '🧠' },
  soul: { label: 'Soul', emoji: '✨' },
};

function isActualCurrentMonth(month: number, year: number): boolean {
  const now = new Date();
  return month === now.getMonth() + 1 && year === now.getFullYear();
}

export function MonthNavigator({
  month,
  year,
  monthName,
  canGoPreviousMonth,
  canGoNextMonth,
  isLoading,
  onPreviousMonth,
  onNextMonth,
  onJumpToCurrentMonth,
}: {
  month: number;
  year: number;
  monthName: string;
  canGoPreviousMonth: boolean;
  canGoNextMonth: boolean;
  isLoading?: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onJumpToCurrentMonth: () => void;
}) {
  const isCurrentMonth = isActualCurrentMonth(month, year);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-2xl border border-input bg-surface px-1.5 py-1.5">
        <button
          type="button"
          disabled={!canGoPreviousMonth || isLoading}
          onClick={onPreviousMonth}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {isCurrentMonth ? 'This month' : monthName}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
            {monthName} {year}
          </p>
        </div>
        <button
          type="button"
          disabled={!canGoNextMonth || isLoading}
          onClick={onNextMonth}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {!isCurrentMonth ? (
        <button
          type="button"
          disabled={isLoading}
          onClick={onJumpToCurrentMonth}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-semibold text-primary transition-colors hover:bg-accent disabled:opacity-50 sm:h-9"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          This month
        </button>
      ) : null}
    </div>
  );
}

export function ActivityTotalsPanel({
  monthItems,
  lifetime,
  monthLabel,
  month,
  year,
  canGoPreviousMonth,
  canGoNextMonth,
  isLoading,
  onPreviousMonth,
  onNextMonth,
  onJumpToCurrentMonth,
}: {
  monthItems: Array<{ activityId: string; name: string; unit: string; total: number; category?: string }>;
  lifetime: Array<{ activityId: string; name: string; unit: string; total: number; category?: string }>;
  monthLabel: string;
  month: number;
  year: number;
  canGoPreviousMonth: boolean;
  canGoNextMonth: boolean;
  isLoading?: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onJumpToCurrentMonth: () => void;
}) {
  const [scope, setScope] = useState<'month' | 'overall'>('month');
  const items = scope === 'month' ? monthItems : lifetime;

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items
      .filter((item) => (item.category || 'body').toLowerCase() === category)
      .sort((a, b) => b.total - a.total),
  })).filter((group) => group.items.length > 0);

  return (
    <section className="section-card space-y-3 p-4 sm:p-5">
        <div>
          <h2 className="section-title">Activity totals</h2>
          <p className="text-xs text-muted-foreground">
            Tap Overall above to see lifetime totals grouped by Mind, Body, and Soul
          </p>
        </div>

      <div className="space-y-3">
        <ChipTabs
          tabs={[
            { id: 'month', label: 'Monthly' },
            { id: 'overall', label: 'Overall' },
          ]}
          active={scope}
          onChange={(id) => setScope(id as 'month' | 'overall')}
        />

        {scope === 'month' && (
          <MonthNavigator
            month={month}
            year={year}
            monthName={monthLabel}
            canGoPreviousMonth={canGoPreviousMonth}
            canGoNextMonth={canGoNextMonth}
            isLoading={isLoading}
            onPreviousMonth={onPreviousMonth}
            onNextMonth={onNextMonth}
            onJumpToCurrentMonth={onJumpToCurrentMonth}
          />
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No {scope === 'month' ? `${monthLabel.toLowerCase()} ` : ''}activity totals yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {grouped.map((group) => {
            const meta = CATEGORY_META[group.category];
            return (
              <div
                key={group.category}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="flex items-center gap-1.5 border-b border-border bg-secondary/40 px-2.5 py-1.5">
                  <span className="text-sm" aria-hidden>
                    {meta.emoji}
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                    {meta.label}
                  </h3>
                  <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {group.items.map((item) => (
                    <li
                      key={item.activityId}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5"
                    >
                      <span className="min-w-0 truncate text-xs font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {item.total.toLocaleString()} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
