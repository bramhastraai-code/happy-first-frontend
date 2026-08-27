/** Full IANA timezone options for registration / profile selects. */

type TimezoneOption = { value: string; label: string };

const FALLBACK_TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'UTC',
] as const;

function formatTimezoneLabel(zone: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    const city = zone.split('/').pop()?.replace(/_/g, ' ') || zone;
    const region = zone.includes('/') ? zone.split('/')[0] : '';
    return offset ? `${city} (${offset})${region ? ` · ${region}` : ''}` : `${city} · ${zone}`;
  } catch {
    return zone;
  }
}

function buildTimezoneOptions(): TimezoneOption[] {
  let zones: string[] = [...FALLBACK_TIMEZONES];
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      zones = (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
        'timeZone'
      );
    }
  } catch {
    // keep fallback
  }

  return zones
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: formatTimezoneLabel(value) }));
}

/** Prefer India first, then alphabetical full list. */
export const TIMEZONE_OPTIONS: TimezoneOption[] = (() => {
  const all = buildTimezoneOptions();
  const preferred = ['Asia/Kolkata', 'UTC'];
  const head = preferred
    .map((value) => all.find((z) => z.value === value))
    .filter((z): z is TimezoneOption => Boolean(z));
  const rest = all.filter((z) => !preferred.includes(z.value));
  return [...head, ...rest];
})();

export type { TimezoneOption };
