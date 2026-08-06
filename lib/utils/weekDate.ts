import { DateTime } from 'luxon';

/** Monday of the current local week as yyyy-MM-dd. */
export function currentWeekStartISO(): string {
  return DateTime.local().startOf('week').toFormat('yyyy-MM-dd');
}

/**
 * Latest fully completed week (previous Monday).
 * Week Analysis must never use the in-progress week.
 */
export function latestCompletedWeekStartISO(): string {
  return DateTime.local().startOf('week').minus({ weeks: 1 }).toFormat('yyyy-MM-dd');
}

/** True when the ISO date is the current (in-progress) Monday week start. */
export function isCurrentWeekStart(weekStart: string): boolean {
  return weekStart === currentWeekStartISO();
}

/**
 * Monday-based week start as yyyy-MM-dd for historical Week Analysis.
 * Defaults to the previous completed week; clamps current/future weeks back.
 */
export function resolveWeekStartISO(input?: string | null): string {
  const completedDefault = latestCompletedWeekStartISO();
  const current = currentWeekStartISO();

  if (input) {
    const parsed = DateTime.fromISO(input, { zone: 'local' });
    if (parsed.isValid) {
      const monday = parsed.startOf('week').toFormat('yyyy-MM-dd');
      if (monday >= current) return completedDefault;
      return monday;
    }
  }
  return completedDefault;
}

export function formatWeekRangeLabel(weekStart: string, weekEnd: string): string {
  const start = DateTime.fromISO(weekStart);
  const end = DateTime.fromISO(weekEnd).minus({ days: 1 });
  if (!start.isValid || !end.isValid) return '';
  if (start.month === end.month) {
    return `${start.toFormat('MMM dd')} – ${end.toFormat('dd, yyyy')}`;
  }
  return `${start.toFormat('MMM dd')} – ${end.toFormat('MMM dd, yyyy')}`;
}

/** Compact range for chips and headers, e.g. "Jul 1–7". */
export function formatWeekRangeShort(weekStart: string, weekEnd: string): string {
  const start = DateTime.fromISO(weekStart);
  const end = DateTime.fromISO(weekEnd).minus({ days: 1 });
  if (!start.isValid || !end.isValid) return '';
  if (start.month === end.month) {
    return `${start.toFormat('MMM d')}–${end.toFormat('d')}`;
  }
  return `${start.toFormat('MMM d')}–${end.toFormat('MMM d')}`;
}

/** Shift a Monday week-start ISO date by a number of weeks. */
export function shiftWeekStartISO(weekStart: string, deltaWeeks: number): string {
  return DateTime.fromISO(weekStart, { zone: 'local' })
    .plus({ weeks: deltaWeeks })
    .toFormat('yyyy-MM-dd');
}

/** True when navigating forward one week still lands on a completed week. */
export function canNavigateToNextWeek(weekStart: string): boolean {
  const next = shiftWeekStartISO(weekStart, 1);
  return next < currentWeekStartISO();
}

/** Distinct calendar months (Mon–Sun week) for cross-month week trackers. */
export function getMonthsInWeek(ref: DateTime = DateTime.local()) {
  const weekStart = ref.startOf('week');
  const months: { month: number; year: number }[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < 7; i++) {
    const day = weekStart.plus({ days: i });
    const key = `${day.year}-${day.month}`;
    if (!seen.has(key)) {
      seen.add(key);
      months.push({ month: day.month, year: day.year });
    }
  }

  return months;
}
