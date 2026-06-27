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
  morning: { enabled: true, time: '08:00' },
  afternoon: { enabled: true, time: '14:00' },
  evening: { enabled: true, time: '18:00' },
  night: { enabled: true, time: '21:00' },
  weekly: { enabled: true, time: '07:00', day: 1 },
};

export const REMINDER_SLOT_LABELS: Record<ReminderSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  weekly: 'Weekly (Monday)',
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

export function formatReminderTime12h(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function getReminderScheduleSummary(schedule: ReminderSchedule): string {
  const dailyCount = DAILY_REMINDER_SLOTS.filter((slot) => schedule[slot].enabled).length;
  const weeklyDay =
    WEEKDAY_OPTIONS.find((day) => day.value === (schedule.weekly.day || 1))?.label ?? 'Monday';

  if (!schedule.weekly.enabled) {
    return `${dailyCount} daily reminder${dailyCount === 1 ? '' : 's'} · Weekly off`;
  }

  return `${dailyCount} daily · Weekly ${weeklyDay} ${formatReminderTime12h(schedule.weekly.time)}`;
}

export function mergeReminderSchedule(
  existing?: ReminderScheduleInput | null,
  legacyReminderTime?: string
): ReminderSchedule {
  const schedule = { ...DEFAULT_REMINDER_SCHEDULE };
  if (legacyReminderTime) {
    schedule.night = { ...schedule.night, time: legacyReminderTime };
  }
  if (!existing) return schedule;

  for (const slot of Object.keys(schedule) as ReminderSlot[]) {
    if (existing[slot]) {
      schedule[slot] = { ...schedule[slot], ...existing[slot] };
    }
  }
  return schedule;
}
