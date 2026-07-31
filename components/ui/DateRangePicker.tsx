'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DateRange {
  /** ISO date, e.g. 2026-07-27 */
  start: string;
  /** ISO date, e.g. 2026-08-02 */
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function buildPresets(): { label: string; range: DateRange }[] {
  const today = DateTime.now();
  const lastWeekStart = today.minus({ weeks: 1 }).startOf('week');
  return [
    {
      label: 'This week',
      range: {
        start: today.startOf('week').toISODate() ?? '',
        end: today.toISODate() ?? '',
      },
    },
    {
      label: 'Last week',
      range: {
        start: lastWeekStart.toISODate() ?? '',
        end: lastWeekStart.endOf('week').toISODate() ?? '',
      },
    },
    {
      label: 'This month',
      range: {
        start: today.startOf('month').toISODate() ?? '',
        end: today.toISODate() ?? '',
      },
    },
    {
      label: 'Last 30 days',
      range: {
        start: today.minus({ days: 29 }).toISODate() ?? '',
        end: today.toISODate() ?? '',
      },
    },
  ];
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    (DateTime.fromISO(value.start).isValid ? DateTime.fromISO(value.start) : DateTime.now()).startOf(
      'month'
    )
  );
  // In-progress selection: the first tapped day before the second tap completes the range.
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = DateTime.now().startOf('day');
  const presets = useMemo(buildPresets, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setPendingStart(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setPendingStart(null);
      }
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const rangeStart = pendingStart ? DateTime.fromISO(pendingStart) : DateTime.fromISO(value.start);
  const rangeEnd = pendingStart ? null : DateTime.fromISO(value.end);

  const gridDays = useMemo(() => {
    const firstCell = viewMonth.startOf('week');
    return Array.from({ length: 42 }, (_, index) => firstCell.plus({ days: index }));
  }, [viewMonth]);

  const selectDay = (day: DateTime) => {
    const iso = day.toISODate();
    if (!iso) return;

    if (!pendingStart) {
      setPendingStart(iso);
      return;
    }

    const start = DateTime.fromISO(pendingStart);
    const [from, to] = day < start ? [day, start] : [start, day];
    setPendingStart(null);
    setOpen(false);
    onChange({ start: from.toISODate() ?? iso, end: to.toISODate() ?? iso });
  };

  const applyPreset = (range: DateRange) => {
    setPendingStart(null);
    setOpen(false);
    setViewMonth(DateTime.fromISO(range.start).startOf('month'));
    onChange(range);
  };

  const label =
    DateTime.fromISO(value.start).isValid && DateTime.fromISO(value.end).isValid
      ? `${DateTime.fromISO(value.start).toFormat('d LLL')} – ${DateTime.fromISO(value.end).toFormat('d LLL yyyy')}`
      : 'Select dates';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setPendingStart(null);
        }}
        aria-expanded={open}
        aria-label="Select date range"
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-full border px-3.5 text-left text-xs font-medium transition-colors sm:h-9',
          open
            ? 'border-primary/40 bg-primary-soft text-primary'
            : 'border-input bg-surface text-foreground hover:bg-accent'
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[23rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-float)]">
          <div className="grid grid-cols-4 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.range)}
                className={cn(
                  'whitespace-nowrap rounded-full px-1 py-1 text-center text-[11px] font-semibold transition-colors',
                  value.start === preset.range.start && value.end === preset.range.end
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-primary-soft hover:text-primary'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((prev) => prev.minus({ months: 1 }))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-foreground">
              {viewMonth.toFormat('LLLL yyyy')}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth((prev) => prev.plus({ months: 1 }))}
              disabled={viewMonth.plus({ months: 1 }) > today.endOf('month')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-1.5 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                {day}
              </span>
            ))}
            {gridDays.map((day) => {
              const iso = day.toISODate() ?? '';
              const inMonth = day.month === viewMonth.month;
              const isFuture = day > today;
              const isStart = rangeStart.isValid && iso === rangeStart.toISODate();
              const isEnd = rangeEnd?.isValid ? iso === rangeEnd.toISODate() : false;
              const inRange =
                !pendingStart &&
                rangeStart.isValid &&
                rangeEnd?.isValid &&
                day > rangeStart &&
                day < rangeEnd;

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isFuture}
                  onClick={() => selectDay(day.startOf('day'))}
                  className={cn(
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                    !inMonth && 'text-muted-foreground/40',
                    inMonth && !isFuture && 'text-foreground hover:bg-primary-soft hover:text-primary',
                    isFuture && 'cursor-not-allowed text-muted-foreground/30',
                    inRange && 'rounded-none bg-primary-soft text-primary',
                    (isStart || isEnd) && 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <p className="mt-1.5 border-t border-border pt-1.5 text-center text-[11px] text-muted-foreground">
            {pendingStart
              ? `From ${DateTime.fromISO(pendingStart).toFormat('d LLL')} — now pick the end date`
              : 'Tap a start date, then an end date'}
          </p>
        </div>
      )}
    </div>
  );
}
