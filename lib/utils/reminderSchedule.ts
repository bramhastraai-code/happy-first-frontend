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
