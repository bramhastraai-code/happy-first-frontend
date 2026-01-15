'use client';

import { useState, useEffect } from 'react';

interface CustomSliderProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onPendingChange?: (isPending: boolean) => void;
  disabled?: boolean;
}

export default function CustomSlider({ checked, onChange, onPendingChange, disabled = false }: CustomSliderProps) {
  const [position, setPosition] = useState<'left' | 'center' | 'right'>(
    checked ? 'right' : 'center'
  );

  useEffect(() => {
    setPosition(checked ? 'right' : 'center');
  }, [checked]);

  const handleTabClick = (tab: 'left' | 'center' | 'right') => {
    if (disabled) return;
    
    setPosition(tab);
    
    if (tab === 'right') {
      onChange(true);
      onPendingChange?.(false);
    } else if (tab === 'left') {
      onChange(false);
      onPendingChange?.(false);
    } else if (tab === 'center') {
      onPendingChange?.(true);
    }
  };

  return (
    <div className="flex-1 select-none">
      <div className={`relative h-11 rounded-xl bg-white border shadow-sm flex overflow-hidden transition-all ${
        disabled ? 'border-gray-200 opacity-60' : 'border-gray-300'
      }`}>
        {/* Sliding Background Indicator */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(33.33%-0.25rem)] m-0.5 rounded-lg shadow-md transition-all duration-300 ease-in-out ${
            disabled ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
            position === 'left' ? 'bg-gradient-to-br from-red-500 to-red-600' :
            position === 'center' ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
            'bg-gradient-to-br from-green-500 to-green-600'
          }`}
          style={{
            left: position === 'left' ? '0.125rem' : position === 'center' ? 'calc(33.33% + 0.125rem)' : 'calc(66.66% + 0.125rem)',
          }}
        />

        {/* Left Tab - Not Done */}
        <button
          type="button"
          onClick={() => handleTabClick('left')}
          disabled={disabled}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300 z-10 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
          } ${position === 'left' ? 'text-white font-semibold' : 'text-red-600 hover:text-red-700 font-medium'}`}
        >
          <svg 
            className={`transition-transform duration-300 ${position === 'left' ? 'scale-110' : 'scale-100'}`}
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          >
            <line x1="4" y1="4" x2="12" y2="12" />
            <line x1="12" y1="4" x2="4" y2="12" />
          </svg>
          <span className="text-[10px] sm:text-xs font-semibold tracking-wide hidden sm:inline">Not Done</span>
        </button>

        {/* Center Tab - Neutral */}
        <button
          type="button"
          onClick={() => handleTabClick('center')}
          disabled={disabled}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300 z-10 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
          } ${position === 'center' ? 'text-white font-semibold' : 'text-gray-600 hover:text-gray-700 font-medium'}`}
        >
          <svg 
            className={`transition-transform duration-300 ${position === 'center' ? 'scale-110' : 'scale-100'}`}
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
          >
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
          <span className="text-[10px] sm:text-xs font-semibold tracking-wide hidden sm:inline">PENDING</span>
        </button>

        {/* Right Tab - Done */}
        <button
          type="button"
          onClick={() => handleTabClick('right')}
          disabled={disabled}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300 z-10 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
          } ${position === 'right' ? 'text-white font-semibold' : 'text-green-600 hover:text-green-700 font-medium'}`}
        >
          <svg 
            className={`transition-transform duration-300 ${position === 'right' ? 'scale-110' : 'scale-100'}`}
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="3,8 6,11 13,4" />
          </svg>
          <span className="text-[10px] sm:text-xs font-semibold tracking-wide hidden sm:inline">Done</span>
        </button>
      </div>
    </div>
  );
}
