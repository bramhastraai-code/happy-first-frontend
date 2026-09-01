import { DateTime } from 'luxon';
import {
  currentWeekStartInProfileZone,
  nowInProfileZone,
  previousWeekStartInProfileZone,
  resolveProfileTimezone,
} from '@/lib/utils/profileTime';

/** Monday of the current profile-zone week as yyyy-MM-dd. */
export function currentWeekStartISO(timezone?: string | null): string {
  return currentWeekStartInProfileZone(timezone);
}

/**
 * Latest fully completed week (previous Monday).
 * Week Analysis must never use the in-progress week.
 */
export function latestCompletedWeekStartISO(timezone?: string | null): string {
  return previousWeekStartInProfileZone(timezone);
}

/** True when the ISO date is the current (in-progress) Monday week start. */
export function isCurrentWeekStart(
  weekStart: string,
  timezone?: string | null
): boolean {
  return weekStart === currentWeekStartISO(timezone);
}

/**
 * Monday-based week start as yyyy-MM-dd for historical Week Analysis.
 * Defaults to the previous completed week; clamps current/future weeks back.
 */
export function resolveWeekStartISO(
  input?: string | null,
  timezone?: string | null
): string {
  const zone = resolveProfileTimezone(timezone);
  const completedDefault = latestCompletedWeekStartISO(zone);
  const current = currentWeekStartISO(zone);

  if (input) {
    const parsed = DateTime.fromISO(String(input).slice(0, 10), { zone });
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
export function shiftWeekStartISO(
  weekStart: string,
  deltaWeeks: number,
  timezone?: string | null
): string {
  const zone = resolveProfileTimezone(timezone);
  return DateTime.fromISO(weekStart, { zone })
    .plus({ weeks: deltaWeeks })
    .toFormat('yyyy-MM-dd');
}

/** True when navigating forward one week still lands on a completed week. */
export function canNavigateToNextWeek(
  weekStart: string,
  timezone?: string | null
): boolean {
  const next = shiftWeekStartISO(weekStart, 1, timezone);
  return next < currentWeekStartISO(timezone);
}

/** Distinct calendar months (Mon–Sun week) for cross-month week trackers. */
export function getMonthsInWeek(ref?: DateTime, timezone?: string | null) {
  const zone = resolveProfileTimezone(timezone);
  const weekStart = (ref ?? nowInProfileZone(zone)).setZone(zone).startOf('week');
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

/** Plan week range for create/repeat — mirrors backend resolveExplicitWeekStart. */
export function resolvePlanWeekPreview(
  weekTarget: 'current' | 'next',
  timezone?: string | null
): { weekStart: string; weekEnd: string } {
  const zone = resolveProfileTimezone(timezone);
  const monday =
    weekTarget === 'next'
      ? nowInProfileZone(zone).startOf('week').plus({ weeks: 1 })
      : nowInProfileZone(zone).startOf('week');
  return {
    weekStart: monday.toFormat('yyyy-MM-dd'),
    weekEnd: monday.plus({ days: 6 }).endOf('day').toISO()!,
  };
}
