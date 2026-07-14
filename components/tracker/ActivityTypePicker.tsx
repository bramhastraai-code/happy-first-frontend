'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTIVITY_TYPES } from '@/lib/tracker/activityMeta';
import type { ActivityType } from '@/lib/tracker/types';

interface ActivityTypePickerProps {
  onSelect: (type: ActivityType) => void;
  startingType?: ActivityType | null;
}

export default function ActivityTypePicker({ onSelect, startingType }: ActivityTypePickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">What are you doing today?</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ACTIVITY_TYPES.map(({ id, label, icon: Icon, softClass, iconClass }) => {
          const isStarting = startingType === id;
          return (
            <button
              key={id}
              type="button"
              disabled={Boolean(startingType)}
              onClick={() => onSelect(id)}
              className={cn(
                'flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-4 text-center transition-all active:scale-[0.98]',
                isStarting
                  ? 'border-primary bg-primary-soft shadow-sm'
                  : 'border-border bg-surface hover:border-primary/30 hover:bg-accent/40'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-11 w-11 items-center justify-center rounded-xl',
                  softClass
                )}
              >
                {isStarting ? (
                  <Loader2 className={cn('h-5 w-5 animate-spin', iconClass)} />
                ) : (
                  <Icon className={cn('h-5 w-5', iconClass)} />
                )}
              </span>
              <span className="text-sm font-semibold text-foreground">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
