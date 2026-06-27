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
