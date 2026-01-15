'use client';

import { useState, useEffect, useRef } from 'react';

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
}

export default function CustomNumericInput({
  value,
  onChange,
  min = 0,
  max = 100000,
  placeholder = 'Enter value',
  unit = '',
  pointsPerUnit = 0,
  disabled = false,
  cadence = 'daily'
}: CustomNumericInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(value > 0 ? value.toString() : '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value > 0 ? value.toString() : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Remove leading zeros except for decimal point cases
    let cleanedValue = inputValue.replace(/^0+(?=\d)/, '');
    
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
    <div className="flex items-center gap-2 flex-1">
      <div className={`relative flex-1 group ${disabled ? 'opacity-60' : ''}`}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full h-11 px-4 pr-20 rounded-xl border-2 transition-all outline-none text-base font-medium ${
              disabled
                ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-500'
                : isFocused
                ? 'bg-white border-blue-500 shadow-md'
                : 'bg-white border-gray-300 hover:border-gray-400'
            }`}
          />
          
          {/* Increment/Decrement Buttons */}
          {!disabled && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={handleIncrement}
                disabled={value >= max}
                className="w-8 h-4 flex items-center justify-center rounded bg-blue-50 hover:bg-blue-100 active:bg-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3,7 6,4 9,7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleDecrement}
                disabled={value <= min}
                className="w-8 h-4 flex items-center justify-center rounded bg-blue-50 hover:bg-blue-100 active:bg-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3,5 6,8 9,5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Points Display */}
      <div className="text-sm text-gray-600 min-w-24 text-right">
        <span className="font-semibold">
          {cadence === 'daily' 
            ? `${pointsPerUnit.toFixed(2)} pts/Day` 
            : `${pointsPerUnit.toFixed(2)} pts/${unit}`}
        </span>
        {cadence === 'weekly' && (
          <span className="block text-xs text-gray-500">(weekly)</span>
        )}
      </div>
    </div>
  );
}
