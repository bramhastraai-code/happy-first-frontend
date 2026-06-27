import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';

export interface CountryOption {
  iso: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

const regionNames =
  typeof Intl !== 'undefined'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

function isoToFlag(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function buildCountryList(): CountryOption[] {
  const options: CountryOption[] = [];

  for (const iso of getCountries()) {
    try {
      const callingCode = getCountryCallingCode(iso);
      const name = regionNames?.of(iso) ?? iso;
      options.push({
        iso,
        name,
        dialCode: `+${callingCode}`,
        flag: isoToFlag(iso),
      });
    } catch {
      // Skip territories without a calling code
    }
  }

  return options.sort((a, b) => {
    if (a.iso === 'IN') return -1;
    if (b.iso === 'IN') return 1;
    return a.name.localeCompare(b.name);
  });
}

export const COUNTRY_OPTIONS: CountryOption[] = buildCountryList();

export function findCountryByDialCode(dialCode: string, preferredIso?: CountryCode): CountryOption | undefined {
  const normalized = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  if (preferredIso) {
    const preferred = COUNTRY_OPTIONS.find((c) => c.iso === preferredIso && c.dialCode === normalized);
    if (preferred) return preferred;
  }
  return COUNTRY_OPTIONS.find((c) => c.dialCode === normalized);
}

export function filterCountries(query: string): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_OPTIONS;

  return COUNTRY_OPTIONS.filter(
    (country) =>
      country.name.toLowerCase().includes(q) ||
      country.iso.toLowerCase().includes(q) ||
      country.dialCode.includes(q.replace(/\s/g, '')) ||
      country.dialCode.replace('+', '').startsWith(q.replace('+', ''))
  );
}
