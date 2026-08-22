import { DateTime } from 'luxon';

/** Normalize API calendar timestamps to a local yyyy-MM-dd key. */
export function toLocalDateKey(iso: string): string {
  const dt = DateTime.fromISO(iso, { zone: 'local' });
  return dt.isValid ? dt.toFormat('yyyy-MM-dd') : iso.split('T')[0];
}

export function calendarDayMatches(
  calendarDay: { date: string; day: number },
  dateString: string
): boolean {
  if (toLocalDateKey(calendarDay.date) === dateString) return true;
  const target = DateTime.fromISO(dateString, { zone: 'local' });
  if (!target.isValid) return false;
  const source = DateTime.fromISO(calendarDay.date, { zone: 'local' });
  return (
    source.isValid &&
    calendarDay.day === target.day &&
    source.month === target.month &&
    source.year === target.year
  );
}
