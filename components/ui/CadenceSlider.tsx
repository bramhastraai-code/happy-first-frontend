'use client';

export type CadenceValue = 'daily' | 'none' | 'weekly';

interface CadenceSliderProps {
  value: CadenceValue;
  onChange: (value: CadenceValue) => void;
  disabled?: boolean;
}

export default function CadenceSlider({ value, onChange, disabled = false }: CadenceSliderProps) {
  const handleTabClick = (tab: CadenceValue) => {
    if (disabled || tab === 'none') return;
    onChange(tab);
  };

  const thumbPosition =
    value === 'daily' ? '0.125rem' :
    value === 'none' ? 'calc(33.333% + 0.125rem)' :
    'calc(66.666% + 0.125rem)';

  const thumbColor =
    value === 'none'
      ? 'bg-gradient-to-br from-gray-300 to-gray-400'
      : disabled
      ? 'bg-gradient-to-br from-gray-300 to-gray-400'
      : value === 'daily'
      ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
      : 'bg-gradient-to-br from-violet-500 to-purple-600';

  return (
    <div className="w-full select-none">
      <div
        className={`relative h-11 rounded-xl bg-white border shadow-sm flex overflow-hidden transition-all ${
          disabled ? 'border-gray-200 opacity-60' : 'border-gray-300'
        }`}
      >
        {/* Sliding Background Indicator — 1/3 width */}
        <div
          className={`absolute top-1 bottom-1 rounded-lg shadow-md transition-all duration-300 ease-in-out ${thumbColor}`}
          style={{
            width: 'calc(33.333% - 0.25rem)',
            left: thumbPosition,
          }}
        />

        {/* Left Tab — Daily */}
        <button
          type="button"
          onClick={() => handleTabClick('daily')}
          disabled={disabled}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300 z-10 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
          } ${
            value === 'daily'
              ? 'text-white font-semibold'
              : 'text-blue-600 hover:text-blue-700 font-medium'
          }`}
        >
          <svg
            className={`transition-transform duration-300 ${value === 'daily' ? 'scale-110' : 'scale-100'}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="3" y="2" width="10" height="12" rx="1" />
            <line x1="3" y1="5" x2="13" y2="5" />
          </svg>
          <span className="text-xs font-semibold tracking-wide">Daily</span>
        </button>

        {/* Middle Tab — None (not clickable, acts as visual placeholder) */}
        <button
          type="button"
          disabled
          className={`relative flex-1 flex items-center justify-center gap-1 py-2 px-1 z-10 cursor-default transition-all duration-300 ${
            value === 'none' ? 'text-gray-500 font-semibold' : 'text-gray-400 font-medium'
          }`}
        >
          <span className="text-xs font-semibold tracking-wide">None</span>
        </button>

        {/* Right Tab — Weekly */}
        <button
          type="button"
          onClick={() => handleTabClick('weekly')}
          disabled={disabled}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300 z-10 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
          } ${
            value === 'weekly'
              ? 'text-white font-semibold'
              : 'text-violet-600 hover:text-violet-700 font-medium'
          }`}
        >
          <svg
            className={`transition-transform duration-300 ${value === 'weekly' ? 'scale-110' : 'scale-100'}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="2" y="3" width="12" height="10" rx="1" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="2" y1="6" x2="14" y2="6" />
          </svg>
          <span className="text-xs font-semibold tracking-wide">Weekly</span>
        </button>
      </div>

      {value === 'none' && (
        <p className="text-xs text-amber-600 mt-1 font-medium">
          Please select Daily or Weekly to continue.
        </p>
      )}
    </div>
  );
}
