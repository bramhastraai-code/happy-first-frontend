import { DateTime } from 'luxon';

/** Default when profile timezone is missing — matches backend calendarDate.js */
export const DEFAULT_PROFILE_TIMEZONE = 'Asia/Kolkata';

/**
 * Resolve the IANA zone used for plan/score/calendar days.
 * Never use the host/runtime zone (Vercel = UTC) for these.
 */
export function resolveProfileTimezone(
  timezone?: string | null,
  fallback: string = DEFAULT_PROFILE_TIMEZONE
): string {
  const zone = String(timezone || '').trim();
  if (!zone || zone === 'local') return fallback;
  return DateTime.now().setZone(zone).isValid ? zone : fallback;
}

/** "Now" in the profile's calendar timezone. */
export function nowInProfileZone(timezone?: string | null): DateTime {
  return DateTime.now().setZone(resolveProfileTimezone(timezone));
}

/** Today's calendar key (yyyy-MM-dd) in the profile timezone. */
export function todayInProfileZone(timezone?: string | null): string {
  return nowInProfileZone(timezone).toFormat('yyyy-MM-dd');
}

/** Monday of the current week (yyyy-MM-dd) in the profile timezone. */
export function currentWeekStartInProfileZone(timezone?: string | null): string {
  return nowInProfileZone(timezone).startOf('week').toFormat('yyyy-MM-dd');
}

/** Previous Monday (yyyy-MM-dd) in the profile timezone. */
export function previousWeekStartInProfileZone(timezone?: string | null): string {
  return nowInProfileZone(timezone)
    .startOf('week')
    .minus({ weeks: 1 })
    .toFormat('yyyy-MM-dd');
}

/**
 * Normalize an API timestamp or date-only string to yyyy-MM-dd in the profile zone.
 * IST midnight is stored as previous-day 18:30 UTC — must not use host local/UTC day.
 */
export function toProfileDateKey(
  iso: string | Date | null | undefined,
  timezone?: string | null
): string {
  const zone = resolveProfileTimezone(timezone);
  if (iso == null || iso === '') return todayInProfileZone(zone);

  if (iso instanceof Date) {
    const dt = DateTime.fromJSDate(iso).setZone(zone);
    return dt.isValid ? dt.toFormat('yyyy-MM-dd') : todayInProfileZone(zone);
  }

  const raw = String(iso);
  const dateOnly = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) && raw.length === 10) {
    return dateOnly;
  }

  const dt = DateTime.fromISO(raw, { setZone: true }).setZone(zone);
  if (dt.isValid) return dt.toFormat('yyyy-MM-dd');

  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : todayInProfileZone(zone);
}
