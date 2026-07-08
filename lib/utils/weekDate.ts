import { DateTime } from 'luxon';

/** Monday-based week start as yyyy-MM-dd (matches backend weekly plans). */
export function resolveWeekStartISO(input?: string | null): string {
  if (input) {
    const parsed = DateTime.fromISO(input, { zone: 'local' });
    if (parsed.isValid) {
      return parsed.toFormat('yyyy-MM-dd');
    }
  }
  return DateTime.local().startOf('week').toFormat('yyyy-MM-dd');
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
