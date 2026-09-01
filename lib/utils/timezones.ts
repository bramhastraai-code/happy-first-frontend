/** Timezone helpers — grouped by GMT offset, sorted +12 → -12. */

export type TimezoneOption = { value: string; label: string };

export type TimezoneGroup = {
  offsetMinutes: number;
  offsetLabel: string;
  zones: TimezoneOption[];
};

const REPRESENTATIVE_ZONES: Record<string, string[]> = {
  '+12:00': ['Pacific/Auckland'],
  '+11:00': ['Australia/Sydney'],
  '+10:00': ['Australia/Brisbane'],
  '+09:00': ['Asia/Tokyo'],
  '+08:00': ['Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai'],
  '+07:00': ['Asia/Bangkok', 'Asia/Jakarta'],
  '+05:45': ['Asia/Kathmandu'],
  '+05:30': ['Asia/Kolkata', 'Asia/Colombo'],
  '+05:00': ['Asia/Karachi'],
  '+04:00': ['Asia/Dubai', 'Asia/Muscat'],
  '+03:00': ['Europe/Moscow', 'Asia/Riyadh'],
  '+02:00': ['Europe/Cairo', 'Africa/Johannesburg'],
  '+01:00': ['Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam'],
  '+00:00': ['Europe/London', 'UTC'],
  '-03:00': ['America/Sao_Paulo'],
  '-04:00': ['America/New_York', 'America/Toronto'],
  '-05:00': ['America/Chicago'],
  '-06:00': ['America/Denver'],
  '-07:00': ['America/Los_Angeles'],
  '-08:00': ['America/Vancouver'],
};

const FALLBACK_ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

function getOffsetMinutes(zone: string, at = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(at);
    const raw = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2]) || 0;
    const mins = Number(match[3]) || 0;
    return sign * (hours * 60 + mins);
  } catch {
    return 0;
  }
}

function formatOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m ? `GMT${sign}${h}:${String(m).padStart(2, '0')}` : `GMT${sign}${h}`;
}

function cityLabel(zone: string): string {
  return zone.split('/').pop()?.replace(/_/g, ' ') || zone;
}

function buildAllZones(): string[] {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      return (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf(
        'timeZone'
      );
    }
  } catch {
    // fallback below
  }
  return [...FALLBACK_ZONES];
}

function groupZones(zones: string[]): TimezoneGroup[] {
  const byOffset = new Map<number, Set<string>>();

  for (const zone of zones) {
    const offset = getOffsetMinutes(zone);
    if (!byOffset.has(offset)) byOffset.set(offset, new Set());
    byOffset.get(offset)!.add(zone);
  }

  // Ensure representative cities appear in each offset bucket
  for (const [offsetKey, cities] of Object.entries(REPRESENTATIVE_ZONES)) {
    const match = offsetKey.match(/([+-])(\d{2}):(\d{2})/);
    if (!match) continue;
    const sign = match[1] === '-' ? -1 : 1;
    const mins = sign * (Number(match[2]) * 60 + Number(match[3]));
    if (!byOffset.has(mins)) byOffset.set(mins, new Set());
    cities.forEach((z) => byOffset.get(mins)!.add(z));
  }

  return [...byOffset.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([offsetMinutes, zoneSet]) => {
      const zonesInGroup = [...zoneSet].sort((a, b) => a.localeCompare(b));
      const cities = zonesInGroup.map(cityLabel);
      const preview = cities.slice(0, 4).join(', ');
      const extra = cities.length > 4 ? ` +${cities.length - 4} more` : '';
      const offsetLabel = formatOffsetLabel(offsetMinutes);
      return {
        offsetMinutes,
        offsetLabel,
        zones: zonesInGroup.map((value) => ({
          value,
          label: `${cityLabel(value)} · ${offsetLabel}`,
        })),
      };
    });
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = groupZones(buildAllZones());

/** Flat list for legacy selects — grouped order, India first when present. */
export const TIMEZONE_OPTIONS: TimezoneOption[] = (() => {
  const flat = TIMEZONE_GROUPS.flatMap((g) => g.zones);
  const india = flat.find((z) => z.value === 'Asia/Kolkata');
  const rest = flat.filter((z) => z.value !== 'Asia/Kolkata');
  return india ? [india, ...rest] : flat;
})();

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function timezoneGroupLabel(group: TimezoneGroup): string {
  const cities = group.zones.map((z) => cityLabel(z.value));
  const preview = cities.slice(0, 5).join(', ');
  const extra = cities.length > 5 ? `, +${cities.length - 5} more` : '';
  return `${group.offsetLabel} — ${preview}${extra}`;
}
