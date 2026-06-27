'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';
import type { CalendarDay } from '@/lib/api/dailyLog';

interface CompactDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  calendarDays?: CalendarDay[];
  disabled?: boolean;
  className?: string;
}

const PANEL_WIDTH = 224;
const PANEL_HEIGHT_ESTIMATE = 300;

export default function CompactDatePicker({
  value,
  onChange,
  maxDate,
  calendarDays = [],
  disabled = false,
  className,
}: CompactDatePickerProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{
    top?: number;
    bottom?: number;
    left: number;
  } | null>(null);

  const selected = DateTime.fromISO(value);
  const max = maxDate ? DateTime.fromISO(maxDate) : DateTime.local();
  const [viewMonth, setViewMonth] = useState(() =>
    selected.isValid ? selected.startOf('month') : DateTime.local().startOf('month')
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selected.isValid) {
      setViewMonth(selected.startOf('month'));
    }
  }, [value]);

  const updatePanelPosition = () => {
    if (!rootRef.current) return;

    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < PANEL_HEIGHT_ESTIMATE && rect.top > PANEL_HEIGHT_ESTIMATE;
    const left = Math.max(8, Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8));

    setPanelStyle(
      openUp
        ? { bottom: window.innerHeight - rect.top + 6, left }
        : { top: rect.bottom + 6, left }
    );
  };

  useLayoutEffect(() => {
    if (open) updatePanelPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const panel = document.getElementById(panelId);
      if (panel?.contains(target)) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    const handleReposition = () => updatePanelPosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, panelId]);

  const logByDate = useMemo(() => {
    const map = new Map<string, boolean>();
    calendarDays.forEach((d) => {
      map.set(d.date.split('T')[0], d.hasLog);
    });
    return map;
  }, [calendarDays]);

  const monthDays = useMemo(() => {
    const start = viewMonth.startOf('month');
    const offset = start.weekday % 7;
    const daysInMonth = start.daysInMonth ?? 30;
    const cells: Array<{ date: string; day: number; isFuture: boolean; hasLog: boolean } | null> =
      [];

    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = start.set({ day: d });
      const iso = dt.toFormat('yyyy-MM-dd');
      cells.push({
        date: iso,
        day: d,
        isFuture: dt > max.endOf('day'),
        hasLog: logByDate.get(iso) ?? false,
      });
    }
    return cells;
  }, [viewMonth, max, logByDate]);

  const label = selected.isValid ? selected.toFormat('d MMM') : 'Pick date';
  const todayIso = DateTime.local().toFormat('yyyy-MM-dd');
  const maxIso = max.toFormat('yyyy-MM-dd');
  const quickPickIso = maxIso < todayIso ? maxIso : todayIso;
  const quickPickLabel = maxIso < todayIso ? 'Latest allowed' : 'Today';

  const pickDate = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const canPrev =
    viewMonth.startOf('month') > max.minus({ months: 12 }).startOf('month');
  const canNext = viewMonth.endOf('month') < max.endOf('month');

  const panel =
    open && panelStyle ? (
      <div
        id={panelId}
        role="dialog"
        aria-modal="false"
        style={{
          position: 'fixed',
          top: panelStyle.top,
          bottom: panelStyle.bottom,
          left: panelStyle.left,
          width: PANEL_WIDTH,
          zIndex: 9999,
        }}
        className="rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-float)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setViewMonth((m) => m.minus({ months: 1 }))}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary disabled:opacity-40"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-foreground">{viewMonth.toFormat('LLL yyyy')}</span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setViewMonth((m) => m.plus({ months: 1 }))}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary disabled:opacity-40"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="py-0.5 text-center text-[10px] font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {monthDays.map((cell, i) =>
            cell ? (
              <button
                key={cell.date}
                type="button"
                disabled={cell.isFuture}
                onClick={() => pickDate(cell.date)}
                className={cn(
                  'relative flex h-7 w-full items-center justify-center rounded-md text-[11px] font-medium transition-colors',
                  cell.isFuture && 'cursor-not-allowed text-muted-foreground/40',
                  !cell.isFuture && value === cell.date && 'bg-primary text-primary-foreground',
                  !cell.isFuture &&
                    value !== cell.date &&
                    'text-foreground hover:bg-secondary',
                  !cell.isFuture && cell.hasLog && value !== cell.date && 'ring-1 ring-primary/40'
                )}
              >
                {cell.day}
              </button>
            ) : (
              <div key={`empty-${i}`} className="h-7" />
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => pickDate(quickPickIso)}
          className="mt-2 w-full rounded-lg bg-primary-soft py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
        >
          {quickPickLabel}
        </button>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={cn('relative w-[5.75rem] shrink-0 sm:w-[6.25rem]', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-1 rounded-full border border-input bg-surface px-2.5 text-left text-xs font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="truncate text-foreground">{label}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
