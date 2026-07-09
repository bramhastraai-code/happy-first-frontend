export type ReminderSlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'weekly';

export interface ReminderSlotConfig {
  enabled: boolean;
  time: string;
  day?: number;
}

export type ReminderSchedule = Record<ReminderSlot, ReminderSlotConfig>;

/** API / persisted profile shape — all fields optional per slot. */
export type ReminderScheduleInput = Partial<
  Record<ReminderSlot, Partial<ReminderSlotConfig>>
>;

export const DEFAULT_REMINDER_SCHEDULE: ReminderSchedule = {
  morning: { enabled: false, time: '08:00' },
  afternoon: { enabled: false, time: '14:00' },
  evening: { enabled: false, time: '18:00' },
  night: { enabled: true, time: '21:00' },
  weekly: { enabled: true, time: '07:00', day: 1 },
};

export const REMINDER_SLOT_LABELS: Record<ReminderSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Daily reminder',
  weekly: 'Weekly summary',
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export const DAILY_REMINDER_SLOTS: ReminderSlot[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
];

/** Daily slots in UI order — primary daily reminder first. */
export const DAILY_REMINDER_UI_ORDER: ReminderSlot[] = [
  'night',
  'morning',
  'afternoon',
  'evening',
];

export function isValidReminderTime(time: string | undefined): boolean {
  if (!time) return false;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return Boolean(match);
}

export function isReminderSlotActive(config: ReminderSlotConfig): boolean {
  return config.enabled && isValidReminderTime(config.time);
}

export function getDefaultTimeForSlot(slot: ReminderSlot): string {
  return DEFAULT_REMINDER_SCHEDULE[slot].time;
}

export function formatReminderTime12h(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** Count reminders that are on and have a valid time. */
export function getEnabledReminderCount(schedule: ReminderSchedule): number {
  const dailyCount = DAILY_REMINDER_SLOTS.filter((slot) =>
    isReminderSlotActive(schedule[slot])
  ).length;
  const weeklyCount = isReminderSlotActive(schedule.weekly) ? 1 : 0;
  return dailyCount + weeklyCount;
}

export function getReminderScheduleIssues(schedule: ReminderSchedule): string[] {
  const issues: string[] = [];

  for (const slot of [...DAILY_REMINDER_SLOTS, 'weekly'] as ReminderSlot[]) {
    const config = schedule[slot];
    if (config.enabled && !isValidReminderTime(config.time)) {
      issues.push(`${REMINDER_SLOT_LABELS[slot]} is on but has no time set`);
    }
  }

  return issues;
}

export function hasValidReminderSchedule(schedule: ReminderSchedule): boolean {
  return getReminderScheduleIssues(schedule).length === 0;
}

export function getReminderScheduleSummary(schedule: ReminderSchedule): string {
  const activeDaily = DAILY_REMINDER_SLOTS.filter((slot) => isReminderSlotActive(schedule[slot]));
  const weeklyDay =
    WEEKDAY_OPTIONS.find((day) => day.value === (schedule.weekly.day || 1))?.label ?? 'Monday';

  let dailyPart: string;
  if (activeDaily.length === 0) {
    dailyPart = 'No daily reminders';
  } else if (activeDaily.length === 1) {
    const slot = activeDaily[0];
    const label = slot === 'night' ? 'Daily' : REMINDER_SLOT_LABELS[slot];
    dailyPart = `${label} ${formatReminderTime12h(schedule[slot].time)}`;
  } else {
    const times = activeDaily
      .map((slot) => `${REMINDER_SLOT_LABELS[slot].replace(' reminder', '')} ${formatReminderTime12h(schedule[slot].time)}`)
      .join(', ');
    dailyPart = times;
  }

  if (!isReminderSlotActive(schedule.weekly)) {
    return `${dailyPart} · Weekly off`;
  }

  return `${dailyPart} · Weekly ${weeklyDay} ${formatReminderTime12h(schedule.weekly.time)}`;
}

function cloneDefaultSchedule(): ReminderSchedule {
  return Object.fromEntries(
    Object.entries(DEFAULT_REMINDER_SCHEDULE).map(([slot, config]) => [slot, { ...config }])
  ) as ReminderSchedule;
}

export function mergeReminderSchedule(
  existing?: ReminderScheduleInput | null,
  legacyReminderTime?: string
): ReminderSchedule {
  const schedule = cloneDefaultSchedule();
  if (legacyReminderTime) {
    schedule.night = { ...schedule.night, time: legacyReminderTime };
  }
  if (!existing) return schedule;

  for (const slot of Object.keys(schedule) as ReminderSlot[]) {
    if (existing[slot]) {
      schedule[slot] = { ...schedule[slot], ...existing[slot] };
    }
  }

  for (const slot of Object.keys(schedule) as ReminderSlot[]) {
    const config = schedule[slot];
    if (config.enabled && !isValidReminderTime(config.time)) {
      schedule[slot] = {
        ...config,
        time: getDefaultTimeForSlot(slot),
      };
    }
  }

  return schedule;
}
