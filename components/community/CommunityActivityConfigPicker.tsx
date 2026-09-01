'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  COMMUNITY_ACTIVITY_LEVEL_OPTIONS,
  type CommunityActivityLevel,
} from '@/lib/api/community';
import { cn } from '@/lib/utils';

const LEVEL_DESCRIPTIONS: Record<CommunityActivityLevel, string> = {
  beginner: 'Easy start',
  active: 'Steady routine',
  champion: 'Go all in',
};

/** Scrolls itself into view when it first appears, so the level options are never hidden below the fold. */
function RevealOnMount({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

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
  discussionOnly?: boolean;
  onDiscussionOnlyChange?: (value: boolean) => void;
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
  discussionOnly = false,
  onDiscussionOnlyChange,
}: CommunityActivityConfigPickerProps) {
  const selectedCount = Object.keys(selectedLevels).length;
  const showDiscussionToggle = Boolean(onDiscussionOnlyChange);
  const sortedActivities = [...activities].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base',
    })
  );

  return (
    <div className="section-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Activities & levels</h2>
        <p className="text-xs text-muted-foreground">
          {discussionOnly
            ? 'Discussion only — chat and share without weekly activity targets'
            : selectedCount === 0
              ? 'Tap activities to add weekly goals, or choose Discussion only below'
              : `${selectedCount} selected · tap an activity to remove it`}
        </p>
      </div>

      {showDiscussionToggle ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onDiscussionOnlyChange?.(false)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left transition-colors',
              !discussionOnly
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-surface hover:bg-secondary/60'
            )}
          >
            <p className="text-xs font-semibold text-foreground">Yes — with targets</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Pick activities & levels</p>
          </button>
          <button
            type="button"
            onClick={() => onDiscussionOnlyChange?.(true)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left transition-colors',
              discussionOnly
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-surface hover:bg-secondary/60'
            )}
          >
            <p className="text-xs font-semibold text-foreground">No — discussion only</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">No weekly targets</p>
          </button>
        </div>
      ) : null}

      {!discussionOnly ? (
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
      ) : null}

      {!discussionOnly && loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !discussionOnly ? (
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {sortedActivities.map((activity) => {
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
                  <RevealOnMount className="rounded-xl border border-primary/20 bg-secondary/40 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Choose a weekly goal for the group
                    </p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      {COMMUNITY_ACTIVITY_LEVEL_OPTIONS.map((option) => {
                        const optionTarget = defaults ? defaults[option.value] : null;
                        const selected = level === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => onLevelChange(activity._id, option.value)}
                            aria-pressed={selected}
                            className={cn(
                              'rounded-xl border px-2 py-2 text-center transition-colors',
                              selected
                                ? 'border-primary bg-primary-soft'
                                : 'border-border bg-surface hover:bg-secondary/60'
                            )}
                          >
                            <span
                              className={cn(
                                'block text-xs font-semibold',
                                selected ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {option.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] font-medium text-foreground">
                              {optionTarget != null
                                ? `${Number(optionTarget).toLocaleString()} ${defaults?.unit || activity.baseUnit || ''}`
                                : LEVEL_DESCRIPTIONS[option.value]}
                            </span>
                            {optionTarget != null ? (
                              <span className="block text-[10px] text-muted-foreground">
                                per week
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {LEVEL_DESCRIPTIONS[level]} — every member aims for{' '}
                      <span className="font-semibold text-foreground">
                        {previewTarget != null
                          ? `${Number(previewTarget).toLocaleString()} ${defaults?.unit || activity.baseUnit || ''}`
                          : 'an auto-set target'}
                      </span>{' '}
                      each week.
                    </p>
                  </RevealOnMount>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
