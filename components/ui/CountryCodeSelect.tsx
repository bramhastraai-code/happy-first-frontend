'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COUNTRY_OPTIONS,
  filterCountries,
  findCountryByDialCode,
  type CountryOption,
} from '@/lib/countries';

interface CountryCodeSelectProps {
  value: string;
  onChange: (dialCode: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  compact?: boolean;
}

export default function CountryCodeSelect({
  value,
  onChange,
  disabled = false,
  id,
  className,
  compact = false,
}: CountryCodeSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIso, setSelectedIso] = useState<string | undefined>(() =>
    findCountryByDialCode(value)?.iso
  );

  const selected = useMemo(() => {
    if (selectedIso) {
      const match = COUNTRY_OPTIONS.find((c) => c.iso === selectedIso);
      if (match && match.dialCode === value) return match;
    }
    return findCountryByDialCode(value) ?? COUNTRY_OPTIONS[0];
  }, [value, selectedIso]);

  const filtered = useMemo(() => filterCountries(query), [query]);

  useEffect(() => {
    const found = findCountryByDialCode(value);
    if (found) {
      setSelectedIso(found.iso);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.clearTimeout(timer);
    };
  }, [open]);

  const handleSelect = (country: CountryOption) => {
    setSelectedIso(country.iso);
    onChange(country.dialCode);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-2xl border border-input bg-surface px-4 text-left text-sm transition-colors',
          compact ? 'h-10 rounded-xl px-3' : 'h-12',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="text-lg leading-none" aria-hidden>
            {selected.flag}
          </span>
          <span className="truncate font-medium text-foreground">{selected.name}</span>
          <span className="shrink-0 font-semibold text-primary">{selected.dialCode}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)]">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code…"
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto p-1.5"
            aria-label="Country codes"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No countries found</li>
            ) : (
              filtered.map((country) => {
                const isSelected = country.iso === selected.iso;
                return (
                  <li key={country.iso} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleSelect(country)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-primary-soft text-foreground'
                          : 'hover:bg-secondary text-foreground'
                      )}
                    >
                      <span className="text-lg leading-none" aria-hidden>
                        {country.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{country.name}</span>
                      <span className="shrink-0 font-semibold text-primary">{country.dialCode}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
