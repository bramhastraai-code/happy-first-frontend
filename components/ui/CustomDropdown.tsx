'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
};

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
}

export function CustomDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select',
  className,
  disabled = false,
  align = 'left',
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-secondary px-3.5 text-left text-sm font-medium text-foreground transition-colors',
          open ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40',
          disabled && 'opacity-60'
        )}
      >
        <span className="min-w-0 truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            'absolute z-30 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-float)]',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'bg-primary-soft text-foreground'
                      : 'text-foreground hover:bg-secondary'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{option.label}</span>
                    {option.description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
