'use client';

interface CadenceSliderProps {
  value: 'daily' | 'weekly';
  onChange: (value: 'daily' | 'weekly') => void;
  disabled?: boolean;
}

export default function CadenceSlider({ value, onChange, disabled = false }: CadenceSliderProps) {
  const position = value === 'daily' ? 'left' : 'right';

  const handleTabClick = (tab: 'left' | 'right') => {
    if (disabled) return;
    
    onChange(tab === 'left' ? 'daily' : 'weekly');
  };

  return (
    <div className="w-full select-none">
      <div className={`relative h-11 rounded-xl bg-white border shadow-sm flex overflow-hidden transition-all ${
        disabled ? 'border-gray-200 opacity-60' : 'border-gray-300'
      }`}>
        {/* Sliding Background Indicator */}
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] m-0.5 rounded-lg shadow-md transition-all duration-300 ease-in-out ${
            disabled ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
            'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}
          style={{
            left: position === 'left' ? '0.125rem' : 'calc(50% + 0.125rem)',
          }}
        />

        {/* Left Tab - Daily */}
        <button
          type="button"
          onClick={() => handleTabClick('left')}
          disabled={disabled}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300 z-10 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
          } ${position === 'left' ? 'text-white font-semibold' : 'text-blue-600 hover:text-blue-700 font-medium'}`}
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
            <rect x="3" y="2" width="10" height="12" rx="1" />
            <line x1="3" y1="5" x2="13" y2="5" />
          </svg>
          <span className="text-xs font-semibold tracking-wide">Daily</span>
        </button>

        {/* Right Tab - Weekly */}
        <button
          type="button"
          onClick={() => handleTabClick('right')}
          disabled={disabled}
          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300 z-10 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
          } ${position === 'right' ? 'text-white font-semibold' : 'text-indigo-600 hover:text-indigo-700 font-medium'}`}
        >
          <svg 
            className={`transition-transform duration-300 ${position === 'right' ? 'scale-110' : 'scale-100'}`}
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
    </div>
  );
}
