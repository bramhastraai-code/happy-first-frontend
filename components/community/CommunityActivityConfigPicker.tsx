'use client';

import { Check, Loader2 } from 'lucide-react';
import {
  COMMUNITY_ACTIVITY_LEVEL_OPTIONS,
  type CommunityActivityLevel,
} from '@/lib/api/community';
import { cn } from '@/lib/utils';

export type ActivityOption = {
  _id: string;
  name: string;
  category?: string | null;
  icon?: string | null;
  baseUnit?: string | null;
};

interface CommunityActivityConfigPickerProps {
  activities: ActivityOption[];
  loading?: boolean;
  category: 'all' | 'mind' | 'body' | 'soul';
  onCategoryChange: (category: 'all' | 'mind' | 'body' | 'soul') => void;
  selectedLevels: Record<string, CommunityActivityLevel>;
  onToggle: (activityId: string) => void;
  onLevelChange: (activityId: string, level: CommunityActivityLevel) => void;
  targetDefaults?: Record<
    string,
    { beginner: number; active: number; champion: number; unit?: string }
  >;
}

export function CommunityActivityConfigPicker({
  activities,
  loading,
  category,
  onCategoryChange,
  selectedLevels,
  onToggle,
  onLevelChange,
  targetDefaults,
}: CommunityActivityConfigPickerProps) {
  const selectedCount = Object.keys(selectedLevels).length;

  return (
    <div className="section-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Activities & levels</h2>
        <p className="text-xs text-muted-foreground">
          {selectedCount} selected · weekly targets auto-assign from Beginner / Active / Champion
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(['all', 'body', 'mind', 'soul'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onCategoryChange(item)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold capitalize',
              category === item
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {activities.map((activity) => {
            const active = Boolean(selectedLevels[activity._id]);
            const level = selectedLevels[activity._id] || 'active';
            const defaults = targetDefaults?.[activity._id];
            const previewTarget = defaults ? defaults[level] : null;
            return (
              <li key={activity._id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => onToggle(activity._id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary-soft'
                      : 'border-border bg-surface hover:bg-secondary/60'
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm">
                    {activity.icon || activity.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{activity.name}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">
                      {activity.category || 'activity'} · {activity.baseUnit}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border'
                    )}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </button>

                {active ? (
                  <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {COMMUNITY_ACTIVITY_LEVEL_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onLevelChange(activity._id, option.value)}
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            level === option.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-surface text-muted-foreground'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Weekly target:{' '}
                      <span className="font-semibold text-foreground">
                        {previewTarget != null
                          ? `${previewTarget} ${defaults?.unit || activity.baseUnit || ''}`
                          : 'auto'}
                      </span>
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
