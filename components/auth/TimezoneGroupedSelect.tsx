'use client';

import { TIMEZONE_GROUPS, timezoneGroupLabel, type TimezoneGroup } from '@/lib/utils/timezones';
import { cn } from '@/lib/utils';

interface TimezoneGroupedSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

function findGroupForZone(zone: string): TimezoneGroup | undefined {
  return TIMEZONE_GROUPS.find((g) => g.zones.some((z) => z.value === zone));
}

export function TimezoneGroupedSelect({
  id,
  value,
  onChange,
  disabled,
  className,
  required,
}: TimezoneGroupedSelectProps) {
  const activeGroup = findGroupForZone(value) || TIMEZONE_GROUPS.find((g) => g.offsetLabel === 'GMT+5:30') || TIMEZONE_GROUPS[0];

  return (
    <div className="space-y-2">
      <select
        value={activeGroup?.offsetMinutes ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const mins = Number(e.target.value);
          const group = TIMEZONE_GROUPS.find((g) => g.offsetMinutes === mins);
          if (group?.zones[0]) onChange(group.zones[0].value);
        }}
        className={cn(
          'h-[38px] w-full rounded-[3px] border border-[#dbdbdb] bg-[#fafafa] px-2.5 text-xs outline-none focus:border-[#a8a8a8]',
          className
        )}
        aria-label="Timezone region"
      >
        {TIMEZONE_GROUPS.map((group) => (
          <option key={group.offsetMinutes} value={group.offsetMinutes}>
            {timezoneGroupLabel(group)}
          </option>
        ))}
      </select>
      <select
        id={id}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-[38px] w-full rounded-[3px] border border-[#dbdbdb] bg-[#fafafa] px-2.5 text-xs outline-none focus:border-[#a8a8a8]',
          className
        )}
      >
        {(activeGroup?.zones || []).map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
      </select>
      <p className="text-[10px] leading-snug text-neutral-400">
        Detected from your device when possible — change if your week should start on a different
        calendar day.
      </p>
    </div>
  );
}
