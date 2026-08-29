import { DateTime } from 'luxon';
import {
  resolveProfileTimezone,
  toProfileDateKey,
} from '@/lib/utils/profileTime';

/** Normalize API calendar timestamps to a profile-zone yyyy-MM-dd key. */
export function toLocalDateKey(
  iso: string,
  timezone?: string | null
): string {
  return toProfileDateKey(iso, timezone);
}

export function calendarDayMatches(
  calendarDay: { date: string; day: number },
  dateString: string,
  timezone?: string | null
): boolean {
  const zone = resolveProfileTimezone(timezone);
  if (toProfileDateKey(calendarDay.date, zone) === dateString) return true;

  const target = DateTime.fromISO(dateString, { zone });
  if (!target.isValid) return false;

  const sourceKey = toProfileDateKey(calendarDay.date, zone);
  const source = DateTime.fromISO(sourceKey, { zone });
  return (
    source.isValid &&
    calendarDay.day === target.day &&
    source.month === target.month &&
    source.year === target.year
  );
}
