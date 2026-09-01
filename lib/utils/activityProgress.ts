export type ActivityProgressTone = 'pending' | 'achieved' | 'not_logged';

export interface ActivityProgressLabel {
  text: string;
  tone: ActivityProgressTone;
}

function formatAmount(value: number): string {
  const n = Number(value) || 0;
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function unitSuffix(unit?: string): string {
  const trimmed = String(unit || '').trim();
  if (!trimmed) return '';
  return ` ${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export function isWeeklyDaysActivity(cadence?: string, unit?: string): boolean {
  return cadence === 'weekly' && String(unit || '').toLowerCase() === 'days';
}

export function formatDailyProgressLabel(
  achieved: number,
  target: number,
  unit?: string
): ActivityProgressLabel {
  const achievedN = Number(achieved) || 0;
  const targetN = Number(target) || 0;
  const suffix = unitSuffix(unit);

  if (targetN <= 0) {
    return achievedN > 0
      ? { text: 'Achieved', tone: 'achieved' }
      : { text: 'Pending', tone: 'pending' };
  }

  if (achievedN >= targetN) {
    const over = achievedN - targetN;
    if (over > 0) {
      return { text: `Achieved +${formatAmount(over)}${suffix}`, tone: 'achieved' };
    }
    return { text: 'Achieved', tone: 'achieved' };
  }

  const remaining = targetN - achievedN;
  return { text: `Pending ${formatAmount(remaining)}${suffix}`, tone: 'pending' };
}

export function formatWeeklyProgressLabel(
  achievedUnits: number,
  targetValue: number,
  unit?: string,
  options?: { isWeeklyDays?: boolean; todayDone?: boolean }
): ActivityProgressLabel {
  if (options?.isWeeklyDays) {
    const done = options.todayDone ?? achievedUnits > 0;
    return done
      ? { text: 'Achieved', tone: 'achieved' }
      : { text: 'Pending', tone: 'pending' };
  }

  const achievedN = Number(achievedUnits) || 0;
  const targetN = Number(targetValue) || 0;
  const suffix = unitSuffix(unit);

  if (targetN <= 0) {
    return achievedN > 0
      ? { text: 'Achieved', tone: 'achieved' }
      : { text: 'Pending', tone: 'pending' };
  }

  if (achievedN >= targetN) {
    const over = achievedN - targetN;
    if (over > 0) {
      return { text: `Achieved +${formatAmount(over)}${suffix}`, tone: 'achieved' };
    }
    return { text: 'Achieved', tone: 'achieved' };
  }

  const remaining = targetN - achievedN;
  return { text: `Pending ${formatAmount(remaining)}${suffix}`, tone: 'pending' };
}

export function formatPlanActivityProgress(activity: {
  cadence?: string;
  unit?: string;
  dailyTarget?: number;
  targetValue?: number;
  achieved?: number;
  achievedUnits?: number;
  TodayLogged?: boolean;
}): ActivityProgressLabel {
  const isWeeklyDays = isWeeklyDaysActivity(activity.cadence, activity.unit);

  if (activity.cadence === 'daily') {
    const target = activity.dailyTarget ?? activity.targetValue ?? 0;
    const achieved = activity.TodayLogged ? Number(activity.achieved) || 0 : 0;
    return formatDailyProgressLabel(achieved, target, activity.unit);
  }

  return formatWeeklyProgressLabel(
    Number(activity.achievedUnits) || 0,
    Number(activity.targetValue) || 0,
    activity.unit,
    {
      isWeeklyDays,
      todayDone: (Number(activity.achieved) || 0) > 0,
    }
  );
}

export function formatDailySummaryActivityProgress(activity: {
  achieved: number;
  target: number;
  unit: string;
  cadance: 'daily' | 'weekly';
  status: string;
}): ActivityProgressLabel {
  if (activity.status === 'pending') {
    if (isWeeklyDaysActivity(activity.cadance, activity.unit)) {
      return { text: 'Pending', tone: 'not_logged' };
    }
    return formatDailyProgressLabel(0, activity.target, activity.unit);
  }

  if (isWeeklyDaysActivity(activity.cadance, activity.unit)) {
    return formatWeeklyProgressLabel(activity.achieved, activity.target, activity.unit, {
      isWeeklyDays: true,
      todayDone: activity.achieved > 0,
    });
  }

  if (activity.cadance === 'daily') {
    return formatDailyProgressLabel(activity.achieved, activity.target, activity.unit);
  }

  if (activity.achieved > 0) {
    return { text: 'Achieved', tone: 'achieved' };
  }

  return { text: 'Pending', tone: 'pending' };
}

export function progressToneClass(tone: ActivityProgressTone): string {
  switch (tone) {
    case 'achieved':
      return 'text-primary';
    case 'not_logged':
      return 'text-amber-700';
    default:
      return 'text-muted-foreground';
  }
}

export function progressBadgeClass(tone: ActivityProgressTone): string {
  switch (tone) {
    case 'achieved':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case 'not_logged':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}
