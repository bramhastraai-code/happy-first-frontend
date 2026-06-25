'use client';

import { Input } from '@/components/ui/input';
import {
  REMINDER_SLOT_LABELS,
  ReminderSchedule,
  ReminderSlot,
  WEEKDAY_OPTIONS,
} from '@/lib/utils/reminderSchedule';

interface ReminderScheduleEditorProps {
  schedule: ReminderSchedule;
  onChange: (schedule: ReminderSchedule) => void;
}

export default function ReminderScheduleEditor({
  schedule,
  onChange,
}: ReminderScheduleEditorProps) {
  const updateSlot = (
    slot: ReminderSlot,
    patch: Partial<ReminderSchedule[ReminderSlot]>
  ) => {
    onChange({
      ...schedule,
      [slot]: { ...schedule[slot], ...patch },
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Daily reminders are sent only if you have not logged yet. Weekly summary runs on your chosen day.
      </p>
      {(Object.keys(REMINDER_SLOT_LABELS) as ReminderSlot[]).map((slot) => (
        <div
          key={slot}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3 bg-white"
        >
          <label className="flex items-center gap-2 min-w-[140px]">
            <input
              type="checkbox"
              checked={schedule[slot].enabled}
              onChange={(e) => updateSlot(slot, { enabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-800">
              {REMINDER_SLOT_LABELS[slot]}
            </span>
          </label>
          <Input
            type="time"
            value={schedule[slot].time}
            disabled={!schedule[slot].enabled}
            onChange={(e) => updateSlot(slot, { time: e.target.value })}
            className="w-36"
          />
          {slot === 'weekly' && (
            <select
              value={schedule.weekly.day || 1}
              disabled={!schedule.weekly.enabled}
              onChange={(e) => updateSlot('weekly', { day: Number(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {WEEKDAY_OPTIONS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
    </div>
  );
}
