'use client';

import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DAILY_REMINDER_SLOTS,
  DAILY_REMINDER_UI_ORDER,
  getDefaultTimeForSlot,
  getEnabledReminderCount,
  isReminderSlotActive,
  isValidReminderTime,
  REMINDER_SLOT_LABELS,
  ReminderSchedule,
  ReminderSlot,
  WEEKDAY_OPTIONS,
} from '@/lib/utils/reminderSchedule';
import { cn } from '@/lib/utils';

function ReminderTimeInput({
  className,
  invalid,
  ...props
}: React.ComponentProps<typeof Input> & { invalid?: boolean }) {
  return (
    <Input
      type="time"
      className={cn(
        'reminder-time-input h-9 shrink-0 pl-3 text-sm',
        invalid && 'border-destructive focus-visible:ring-destructive/30',
        className
      )}
      {...props}
    />
  );
}

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
  label,
  enabled,
  time,
  onToggle,
  onTimeChange,
  subtitle,
  children,
}: {
  label: string;
  enabled: boolean;
  time: string;
  onToggle: (enabled: boolean) => void;
  onTimeChange: (time: string) => void;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const needsTime = enabled && !isValidReminderTime(time);

  return (
    <div className={cn('px-3 py-2.5 sm:px-4', !enabled && 'opacity-60')}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {subtitle && enabled && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
          {!enabled && (
            <p className="text-[11px] text-muted-foreground">Off — turn on to set a time</p>
          )}
        </div>
        <ReminderToggle
          enabled={enabled}
          onChange={onToggle}
          label={`${enabled ? 'Disable' : 'Enable'} ${label}`}
        />
      </div>

      {enabled && (
        <div className="mt-2.5 space-y-1.5">
          <div className={children ? 'grid grid-cols-2 items-center gap-2' : undefined}>
            {children}
            <ReminderTimeInput
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              aria-label={`${label} time`}
              aria-invalid={needsTime}
              invalid={needsTime}
              className={cn('h-9', children ? 'reminder-time-input-block' : 'w-full max-w-[10.5rem]')}
            />
          </div>
          {needsTime && (
            <p className="text-xs text-destructive">Choose a time for this reminder to work.</p>
          )}
        </div>
      )}
    </div>
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

  const handleToggle = (enabled: boolean) => {
    if (enabled && !isValidReminderTime(config.time)) {
      onUpdate({ enabled: true, time: getDefaultTimeForSlot(slot) });
      return;
    }
    onUpdate({ enabled });
  };

  return (
    <ReminderRow
      label={label}
      enabled={config.enabled}
      time={config.time}
      onToggle={handleToggle}
      onTimeChange={(time) => onUpdate({ time })}
      subtitle={highlight ? 'Default · 9:00 PM' : undefined}
    />
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

  const handleToggle = (enabled: boolean) => {
    if (enabled && !isValidReminderTime(config.time)) {
      onUpdate({ enabled: true, time: getDefaultTimeForSlot('weekly') });
      return;
    }
    onUpdate({ enabled });
  };

  return (
    <ReminderRow
      label={label}
      enabled={config.enabled}
      time={config.time}
      onToggle={handleToggle}
      onTimeChange={(time) => onUpdate({ time })}
      subtitle="Once a week"
    >
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
    </ReminderRow>
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

  const activeDailyCount = DAILY_REMINDER_SLOTS.filter((slot) =>
    isReminderSlotActive(schedule[slot])
  ).length;
  const totalActiveCount = getEnabledReminderCount(schedule);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Turn a reminder on, then pick when it should notify you. Only reminders with a set time are
        active.
      </p>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Daily
          </h3>
          <span className="text-[11px] font-medium text-muted-foreground">
            {activeDailyCount} of {DAILY_REMINDER_SLOTS.length} active
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Weekly summary
          </h3>
          <span className="text-[11px] font-medium text-muted-foreground">
            {schedule.weekly.enabled && isReminderSlotActive(schedule.weekly)
              ? 'Active'
              : schedule.weekly.enabled
                ? 'Needs time'
                : 'Off'}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-surface">
          <WeeklyReminderRow
            schedule={schedule}
            onUpdate={(patch) => updateSlot('weekly', patch)}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {totalActiveCount === 0
          ? 'No reminders active yet.'
          : `${totalActiveCount} reminder${totalActiveCount === 1 ? '' : 's'} will be sent.`}
      </p>
    </div>
  );
}
