'use client';

import { useMemo } from 'react';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import { COUNTRY_OPTIONS, flagForCountry } from '@/lib/utils/countries';

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
}: CountrySearchSelectProps) {
  const options = useMemo(
    () =>
      COUNTRY_OPTIONS.map((country) => ({
        value: country,
        label: country,
        icon: flagForCountry(country),
      })),
    []
  );

  return (
    <CustomDropdown
      id={id}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select country"
      searchable
      searchPlaceholder="Search country…"
      emptyMessage="No countries found"
      variant="auth"
      disabled={disabled}
      triggerClassName={className}
      aria-label="Country"
    />
  );
}
