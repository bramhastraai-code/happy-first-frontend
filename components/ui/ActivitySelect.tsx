'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Activity } from '@/lib/api/activity';

interface ActivitySelectProps {
  value: string;
  onChange: (activityId: string) => void;
  activities: Activity[];
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
}

export default function ActivitySelect({
  value,
  onChange,
  activities,
  placeholder = 'All activities',
  allLabel = 'All activities',
  disabled = false,
  className,
}: ActivitySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () => [...activities].sort((a, b) => a.name.localeCompare(b.name)),
    [activities]
  );

  const selected = useMemo(
    () => sorted.find((a) => a._id === value) ?? null,
    [sorted, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
    );
  }, [sorted, query]);

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

  const handleSelect = (activityId: string) => {
    onChange(activityId);
    setOpen(false);
    setQuery('');
  };

  const label = selected?.name ?? placeholder;

  return (
    <div ref={rootRef} className={cn('relative w-full sm:w-[10.5rem] sm:shrink-0', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-full border border-input bg-surface px-3.5 text-left text-xs font-medium transition-colors sm:h-9',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="min-w-0 truncate text-foreground">{label}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-[60] mt-1.5 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)] sm:left-auto sm:right-0 sm:w-52">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto p-1 sm:max-h-48" aria-label="Activities">
            <li role="option" aria-selected={value === ''}>
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={cn(
                  'flex w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                  value === ''
                    ? 'bg-primary-soft font-semibold text-primary'
                    : 'text-foreground hover:bg-secondary'
                )}
              >
                {allLabel}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-2.5 py-4 text-center text-xs text-muted-foreground">No activities found</li>
            ) : (
              filtered.map((activity) => {
                const isSelected = activity._id === value;
                return (
                  <li key={activity._id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleSelect(activity._id)}
                      className={cn(
                        'flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors',
                        isSelected
                          ? 'bg-primary-soft text-foreground'
                          : 'hover:bg-secondary text-foreground'
                      )}
                    >
                      <span className="truncate text-xs font-medium">{activity.name}</span>
                      {activity.category && (
                        <span className="truncate text-[10px] capitalize text-muted-foreground">
                          {activity.category}
                        </span>
                      )}
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
