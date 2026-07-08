'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DAILY_REMINDER_SLOTS,
  DAILY_REMINDER_UI_ORDER,
  REMINDER_SLOT_LABELS,
  ReminderSchedule,
  ReminderSlot,
  WEEKDAY_OPTIONS,
} from '@/lib/utils/reminderSchedule';
import { cn } from '@/lib/utils';

function ReminderTimeInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      type="time"
      className={cn('reminder-time-input h-9 shrink-0 pl-3 text-sm', className)}
      {...props}
    />
  );
}

interface ReminderScheduleEditorProps {
  schedule: ReminderSchedule;
  onChange: (schedule: ReminderSchedule) => void;
}

function ReminderCheckbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
        checked
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-surface text-transparent hover:border-primary/50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </button>
  );
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

function DailyReminderRow({
  slot,
  schedule,
  onUpdate,
  highlight,
}: {
  slot: ReminderSlot;
  schedule: ReminderSchedule;
  onUpdate: (patch: Partial<ReminderSchedule[ReminderSlot]>) => void;
  highlight?: boolean;
}) {
  const config = schedule[slot];
  const label = REMINDER_SLOT_LABELS[slot].replace(' (Monday)', '');

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3 sm:px-4',
        !config.enabled && 'opacity-70',
        highlight && config.enabled && 'bg-primary-soft/50'
      )}
    >
      <ReminderCheckbox
        checked={config.enabled}
        onChange={(enabled) => onUpdate({ enabled })}
        label={`Enable ${label} reminder`}
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {highlight && config.enabled && (
          <p className="text-[11px] text-muted-foreground">Default · 9:00 PM</p>
        )}
      </div>

      {config.enabled ? (
        <ReminderTimeInput
          value={config.time}
          disabled={!config.enabled}
          onChange={(e) => onUpdate({ time: e.target.value })}
          aria-label={`${label} time`}
          className="h-8"
        />
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">Off</span>
      )}
    </div>
  );
}

function WeeklyReminderRow({
  schedule,
  onUpdate,
}: {
  schedule: ReminderSchedule;
  onUpdate: (patch: Partial<ReminderSchedule['weekly']>) => void;
}) {
  const config = schedule.weekly;
  const label = 'Weekly summary';

  return (
    <div className={cn('px-3 py-2.5 sm:px-4', !config.enabled && 'opacity-60')}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <ReminderToggle
          enabled={config.enabled}
          onChange={(enabled) => onUpdate({ enabled })}
          label={`${label} reminders`}
        />
      </div>

      {config.enabled && (
        <div className="mt-2.5 grid grid-cols-2 items-center gap-2">
          <div className="relative min-w-0">
            <select
              value={schedule.weekly.day || 1}
              disabled={!schedule.weekly.enabled}
              onChange={(e) => onUpdate({ day: Number(e.target.value) })}
              aria-label="Weekly reminder day"
              className="h-9 w-full appearance-none rounded-lg border border-input bg-surface pl-3 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {WEEKDAY_OPTIONS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
          <ReminderTimeInput
            value={config.time}
            disabled={!config.enabled}
            onChange={(e) => onUpdate({ time: e.target.value })}
            aria-label={`${label} time`}
            className="reminder-time-input-block h-9"
          />
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
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Daily
          </h3>
          <span className="text-[11px] font-medium text-primary">
            {enabledDailyCount}/{DAILY_REMINDER_SLOTS.length} on
          </span>
        </div>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {DAILY_REMINDER_UI_ORDER.map((slot) => (
            <DailyReminderRow
              key={slot}
              slot={slot}
              schedule={schedule}
              onUpdate={(patch) => updateSlot(slot, patch)}
              highlight={slot === 'night'}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Weekly summary
        </h3>
        <div className="rounded-xl border border-border bg-surface">
          <WeeklyReminderRow
            schedule={schedule}
            onUpdate={(patch) => updateSlot('weekly', patch)}
          />
        </div>
      </div>
    </div>
  );
}
