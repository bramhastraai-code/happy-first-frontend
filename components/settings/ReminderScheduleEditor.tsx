'use client';

import { Input } from '@/components/ui/input';
import {
  DAILY_REMINDER_SLOTS,
  REMINDER_SLOT_LABELS,
  ReminderSchedule,
  ReminderSlot,
  WEEKDAY_OPTIONS,
  formatReminderTime12h,
} from '@/lib/utils/reminderSchedule';
import { cn } from '@/lib/utils';

interface ReminderScheduleEditorProps {
  schedule: ReminderSchedule;
  onChange: (schedule: ReminderSchedule) => void;
}

function ReminderToggle({
  enabled,
  disabled,
  onChange,
  label,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        enabled ? 'bg-primary' : 'bg-border',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function ReminderRow({
  slot,
  schedule,
  onUpdate,
  showDaySelect,
}: {
  slot: ReminderSlot;
  schedule: ReminderSchedule;
  onUpdate: (patch: Partial<ReminderSchedule[ReminderSlot]>) => void;
  showDaySelect?: boolean;
}) {
  const config = schedule[slot];
  const label = REMINDER_SLOT_LABELS[slot].replace(' (Monday)', '');

  return (
    <div className={cn('px-3 py-3 sm:px-4', !config.enabled && 'opacity-60')}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {config.enabled && (
            <p className="text-[11px] text-muted-foreground sm:hidden">
              {formatReminderTime12h(config.time)}
            </p>
          )}
        </div>
        <ReminderToggle
          enabled={config.enabled}
          onChange={(enabled) => onUpdate({ enabled })}
          label={`${label} reminders`}
        />
      </div>

      {config.enabled && (
        <div className={cn('mt-2.5 flex flex-wrap items-center gap-2', showDaySelect && 'sm:gap-3')}>
          <Input
            type="time"
            value={config.time}
            disabled={!config.enabled}
            onChange={(e) => onUpdate({ time: e.target.value })}
            aria-label={`${label} time`}
            className="h-9 w-full min-w-[7rem] flex-1 text-xs sm:max-w-32"
          />
          {showDaySelect && (
            <select
              value={schedule.weekly.day || 1}
              disabled={!schedule.weekly.enabled}
              onChange={(e) => onUpdate({ day: Number(e.target.value) })}
              aria-label="Weekly reminder day"
              className="h-9 w-full min-w-[7rem] flex-1 rounded-xl border border-input bg-surface px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 sm:max-w-36 sm:text-sm"
            >
              {WEEKDAY_OPTIONS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
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

  const enabledDailyCount = DAILY_REMINDER_SLOTS.filter((slot) => schedule[slot].enabled).length;

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        WhatsApp reminders are sent only on days you have not logged yet.
      </p>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Daily
          </h3>
          <span className="text-[11px] font-medium text-primary">
            {enabledDailyCount} of {DAILY_REMINDER_SLOTS.length} on
          </span>
        </div>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {DAILY_REMINDER_SLOTS.map((slot) => (
            <ReminderRow
              key={slot}
              slot={slot}
              schedule={schedule}
              onUpdate={(patch) => updateSlot(slot, patch)}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Weekly summary
        </h3>
        <div className="rounded-xl border border-border bg-surface">
          <ReminderRow
            slot="weekly"
            schedule={schedule}
            onUpdate={(patch) => updateSlot('weekly', patch)}
            showDaySelect
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Sent once per week on the day you choose.
        </p>
      </div>
    </div>
  );
}
