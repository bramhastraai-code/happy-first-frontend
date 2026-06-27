'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface CustomNumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  unit?: string;
  pointsPerUnit?: number;
  disabled?: boolean;
  cadence?: string;
  compact?: boolean;
  className?: string;
}

export default function CustomNumericInput({
  value,
  onChange,
  min = 0,
  max = 500000,
  placeholder = 'Enter value',
  unit = '',
  pointsPerUnit = 0,
  disabled = false,
  cadence = 'daily',
  compact = false,
  className,
}: CustomNumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(value > 0 ? value.toString() : '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const renderedValue = isFocused ? displayValue : (value > 0 ? value.toString() : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Remove leading zeros except for decimal point cases
    const cleanedValue = inputValue.replace(/^0+(?=\d)/, '');
    
    // Allow only numbers and one decimal point
    if (!/^\d*\.?\d*$/.test(cleanedValue)) {
      return;
    }

    setDisplayValue(cleanedValue);
    
    // Parse and validate the number
    const numValue = parseFloat(cleanedValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    } else if (cleanedValue === '.') {
      // Allow typing just a decimal point
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Clamp value on blur
    let numValue = parseFloat(displayValue) || 0;
    if (numValue < min) numValue = min;
    if (numValue > max) numValue = max;
    
    onChange(numValue);
    setDisplayValue(numValue > 0 ? numValue.toString() : '');
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(value > 0 ? value.toString() : '');
  };

  const handleIncrement = () => {
    const newValue = Math.min(value + 1, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - 1, min);
    onChange(newValue);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        compact ? 'shrink-0' : 'flex-1',
        className
      )}
    >
      <div
        className={cn(
          'relative group',
          compact ? 'w-[5.5rem] shrink-0' : 'flex-1',
          disabled && 'opacity-60'
        )}
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={renderedValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg border transition-all outline-none font-medium text-center',
              compact ? 'h-9 px-2 pr-7 text-sm' : 'h-11 px-4 pr-20 rounded-xl border-2 text-base',
              disabled
                ? 'cursor-not-allowed border-input bg-secondary text-muted-foreground'
                : isFocused
                  ? 'border-primary bg-surface shadow-sm'
                  : 'border-input bg-surface hover:border-muted-foreground/40'
            )}
          />

          {!disabled && (
            <div
              className={cn(
                'absolute top-1/2 flex -translate-y-1/2 flex-col gap-0.5',
                compact ? 'right-1' : 'right-2'
              )}
            >
              <button
                type="button"
                onClick={handleIncrement}
                disabled={value >= max}
                className={cn(
                  'flex items-center justify-center rounded bg-primary-soft transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-secondary',
                  compact ? 'h-3 w-5' : 'h-4 w-8'
                )}
              >
                <svg
                  width={compact ? 10 : 12}
                  height={compact ? 10 : 12}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="3,7 6,4 9,7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleDecrement}
                disabled={value <= min}
                className={cn(
                  'flex items-center justify-center rounded bg-primary-soft transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-secondary',
                  compact ? 'h-3 w-5' : 'h-4 w-8'
                )}
              >
                <svg
                  width={compact ? 10 : 12}
                  height={compact ? 10 : 12}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="3,5 6,8 9,5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          'text-muted-foreground text-right',
          compact ? 'min-w-0 text-[11px] leading-tight' : 'min-w-24 text-sm'
        )}
      >
        <span className="font-semibold text-foreground">
          {cadence === 'daily'
            ? `${pointsPerUnit.toFixed(compact ? 1 : 2)} pts`
            : `${pointsPerUnit.toFixed(compact ? 1 : 2)} pts/${unit}`}
        </span>
        {!compact && cadence === 'weekly' && (
          <span className="block text-xs text-muted-foreground">(weekly)</span>
        )}
      </div>
    </div>
  );
}
