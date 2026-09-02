'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { COUNTRY_OPTIONS } from '@/lib/utils/countries';
import { cn } from '@/lib/utils';

interface CountrySearchSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function CountrySearchSelect({
  id,
  value,
  onChange,
  disabled,
  className,
  required,
}: CountrySearchSelectProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...COUNTRY_OPTIONS];
    return COUNTRY_OPTIONS.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search country…"
          disabled={disabled}
          className="h-9 w-full rounded-[3px] border border-[#dbdbdb] bg-[#fafafa] pl-8 pr-2.5 text-xs outline-none focus:border-[#a8a8a8]"
          aria-label="Search countries"
        />
      </div>
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
        size={Math.min(6, Math.max(3, filtered.length))}
      >
        {filtered.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>
    </div>
  );
}
