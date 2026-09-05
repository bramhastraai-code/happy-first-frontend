'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
};

interface CustomDropdownProps {
  id?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra classes for the trigger button */
  triggerClassName?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  /**
   * `default` — full-width form field
   * `pill` — compact orange-bordered sort chip (e.g. “Newest first”)
   * `auth` — Instagram-style register / login field
   */
  variant?: 'default' | 'pill' | 'auth';
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  'aria-label'?: string;
}

const listScrollClass =
  'max-h-56 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#c7c7c7_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c7c7c7] [&::-webkit-scrollbar-track]:bg-transparent';

export function CustomDropdown({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select',
  className,
  triggerClassName,
  disabled = false,
  align = 'left',
  variant = 'default',
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches',
  'aria-label': ariaLabel,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const isPill = variant === 'pill';
  const isAuth = variant === 'auth';

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q) ||
        (option.description || '').toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const viewportPad = 8;
    const minWidth = isPill ? 176 : rect.width;
    const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - viewportPad * 2);
    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;
    const preferred = 224;
    const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(96, Math.min(preferred, openUp ? spaceAbove : spaceBelow));
    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.max(viewportPad, Math.min(left, window.innerWidth - width - viewportPad));
    const top = openUp ? rect.top - gap - maxHeight : rect.bottom + gap;
    setMenuPos({ top, left, width, maxHeight });
  }, [align, isPill]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setMenuPos(null);
      return;
    }
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    updateMenuPosition();
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => updateMenuPosition();
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const close = () => setOpen(false);

  const selectOption = (next: string) => {
    onChange(next);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) selectOption(option.value);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn('relative', isPill ? 'inline-flex' : 'w-full', className)}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex items-center justify-between gap-2 text-left transition-colors',
          isPill
            ? cn(
                'h-9 w-auto rounded-full border border-primary bg-surface px-3.5 text-xs font-medium text-foreground',
                open && 'ring-2 ring-primary/20',
                !open && 'hover:bg-primary-soft/50'
              )
            : isAuth
              ? cn(
                  'h-[38px] w-full rounded-[3px] border bg-[#fafafa] px-2.5 text-xs font-normal',
                  open
                    ? 'border-[#a8a8a8]'
                    : 'border-[#dbdbdb] hover:border-[#a8a8a8]',
                  selected ? 'text-[#262626]' : 'text-[#737373]'
                )
              : cn(
                  'h-11 w-full rounded-xl border bg-secondary px-3.5 text-sm font-medium text-foreground',
                  open
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40'
                ),
          disabled && 'cursor-not-allowed opacity-60',
          triggerClassName
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon ? (
            <span className="text-base leading-none" aria-hidden>
              {selected.icon}
            </span>
          ) : null}
          <span className="min-w-0 truncate">{selected?.label || placeholder}</span>
        </span>
        <ChevronDown
          className={cn(
            'shrink-0 text-muted-foreground transition-transform duration-200',
            isPill || isAuth ? 'h-3.5 w-3.5' : 'h-4 w-4',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && menuPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              className={cn(
                'fixed z-[80] overflow-hidden border bg-white',
                isAuth
                  ? 'rounded-lg border-[#dbdbdb] shadow-[0_12px_28px_rgba(0,0,0,0.12)]'
                  : 'rounded-xl border-border shadow-[var(--shadow-float)]'
              )}
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
              }}
            >
              {searchable ? (
                <div className={cn('border-b border-[#efefef]', isAuth ? 'p-1.5' : 'p-2')}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8e8e8e]" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setActiveIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault();
                      }}
                      placeholder={searchPlaceholder}
                      className={cn(
                        'w-full bg-[#fafafa] text-foreground outline-none placeholder:text-[#8e8e8e]',
                        isAuth
                          ? 'h-8 rounded-md border border-[#efefef] pl-8 pr-2 text-xs'
                          : 'h-10 rounded-lg border border-border pl-9 pr-3 text-sm'
                      )}
                      aria-label={searchPlaceholder}
                    />
                  </div>
                </div>
              ) : null}

              <ul
                id={listId}
                role="listbox"
                className={cn(listScrollClass, isAuth ? 'p-1' : 'p-1')}
                style={{ maxHeight: searchable ? menuPos.maxHeight - 56 : menuPos.maxHeight }}
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                    {emptyMessage}
                  </li>
                ) : (
                  filtered.map((option, index) => {
                    const active = option.value === value;
                    const hovered = index === activeIndex;
                    return (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          ref={(node) => {
                            optionRefs.current[index] = node;
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectOption(option.value)}
                          className={cn(
                            'flex w-full items-center gap-2 text-left transition-colors',
                            isAuth
                              ? 'rounded-md px-2.5 py-2 text-xs'
                              : 'rounded-lg px-3 py-2.5',
                            active
                              ? 'bg-primary-soft text-foreground'
                              : hovered
                                ? 'bg-[#f5f5f5] text-foreground'
                                : 'text-foreground'
                          )}
                        >
                          {option.icon ? (
                            <span className="text-base leading-none" aria-hidden>
                              {option.icon}
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                'block truncate',
                                isAuth ? 'font-medium' : 'text-sm font-medium'
                              )}
                            >
                              {option.label}
                            </span>
                            {option.description ? (
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                {option.description}
                              </span>
                            ) : null}
                          </span>
                          {active ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
