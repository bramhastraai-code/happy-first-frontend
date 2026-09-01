'use client';

import { CheckCircle2, Lock, Timer } from 'lucide-react';
import CustomSlider from '@/components/ui/CustomSlider';
import CustomNumericInput from '@/components/ui/CustomNumericInput';
import { cn } from '@/lib/utils';
import {
  formatDailyProgressLabel,
  formatPlanActivityProgress,
  formatWeeklyProgressLabel,
  isWeeklyDaysActivity,
  type ActivityProgressTone,
} from '@/lib/utils/activityProgress';
import type { WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import type { Activity as ActivityType } from '@/lib/api/activity';

interface TaskActivityRowProps {
  activity: WeeklyPlanActivity;
  activityData?: ActivityType;
  activityId: string;
  isSurprise: boolean;
  isAfter6PM: boolean;
  timeUntilMidnight: string;
  value: number;
  checkboxChecked: boolean;
  isPending: boolean;
  onActivityChange: (activityId: string, value: string) => void;
  onCheckboxChange: (activityId: string, checked: boolean) => void;
  onPendingChange: (activityId: string, isPending: boolean) => void;
  getActivityInputMax: (activity: WeeklyPlanActivity, activityData?: ActivityType) => number;
  isLast?: boolean;
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'locked' | 'logged' | 'points' | ActivityProgressTone;
  children: React.ReactNode;
}) {
  const styles = {
    locked: 'bg-primary-soft text-accent-foreground',
    logged: 'bg-success-soft text-success',
    points: 'bg-secondary text-muted-foreground',
    pending: 'bg-slate-100 text-slate-700',
    achieved: 'bg-success-soft text-success',
    not_logged: 'bg-amber-50 text-amber-800',
  };

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        styles[tone]
      )}
    >
      {children}
    </span>
  );
}

export default function TaskActivityRow({
  activity,
  activityData,
  activityId,
  isSurprise,
  isAfter6PM,
  timeUntilMidnight,
  value,
  checkboxChecked,
  isPending,
  onActivityChange,
  onCheckboxChange,
  onPendingChange,
  getActivityInputMax,
  isLast,
}: TaskActivityRowProps) {
  const isWeeklyDays = isWeeklyDaysActivity(activity.cadence, activity.unit);
  const unitLabel = activity.unit || '';
  const cadenceSuffix = activity.cadence === 'daily' ? '/day' : '/week';
  const displayTarget =
    activity.cadence === 'daily'
      ? (activity.dailyTarget ?? activity.targetValue)
      : activity.targetValue;
  const loggedProgress = activity.TodayLogged
    ? activity.cadence === 'daily'
      ? formatDailyProgressLabel(
          activity.achieved ?? 0,
          activity.dailyTarget ?? activity.targetValue,
          activity.unit
        )
      : isWeeklyDays
        ? formatWeeklyProgressLabel(activity.achieved ?? 0, activity.targetValue, activity.unit, {
            isWeeklyDays: true,
            todayDone: (activity.achieved ?? 0) > 0,
          })
        : formatWeeklyProgressLabel(
            activity.achievedUnits ?? 0,
            activity.targetValue,
            activity.unit
          )
    : formatPlanActivityProgress(activity);

  const renderControl = () => {
    if (!isAfter6PM) {
      if (isWeeklyDays) {
        return (
          <>
            <CustomSlider checked={false} onChange={() => {}} disabled />
            <StatusBadge tone="locked">
              <Timer className="h-3 w-3" />
              <span className="font-mono">{timeUntilMidnight}</span>
            </StatusBadge>
          </>
        );
      }

      return (
        <>
          <div className="relative w-[7.25rem] shrink-0">
            <input
              type="text"
              disabled
              placeholder={unitLabel}
              className="h-12 w-full rounded-lg border border-input bg-secondary px-3 text-center text-base text-muted-foreground opacity-70"
            />
            <Lock className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <StatusBadge tone="locked">
            <Timer className="h-3 w-3" />
            <span className="font-mono">{timeUntilMidnight}</span>
          </StatusBadge>
        </>
      );
    }

    if (activity.TodayLogged) {
      if (isWeeklyDays) {
        return (
          <>
            <CustomSlider
              checked={(activity.achieved ?? 0) > 0}
              onChange={() => {}}
              disabled
            />
            <StatusBadge tone={loggedProgress.tone}>
              <CheckCircle2 className="h-3 w-3" />
              {loggedProgress.text}
            </StatusBadge>
          </>
        );
      }

      return (
        <StatusBadge tone={loggedProgress.tone}>
          <CheckCircle2 className="h-3 w-3" />
          {loggedProgress.text}
        </StatusBadge>
      );
    }

    if (isWeeklyDays) {
      return (
        <>
          <CustomSlider
            checked={checkboxChecked}
            isPending={isPending}
            onChange={(checked) => onCheckboxChange(activityId, checked)}
            onPendingChange={(pending) => onPendingChange(activityId, pending)}
          />
          <StatusBadge tone="points">
            {(activity.pointsPerUnit ?? 0).toFixed(1)}%
          </StatusBadge>
        </>
      );
    }

    return (
      <CustomNumericInput
        compact
        value={value}
        onChange={(val) => onActivityChange(activityId, val.toString())}
        min={0}
        max={getActivityInputMax(activity, activityData)}
        placeholder={unitLabel}
        unit={unitLabel}
        pointsPerUnit={activity.pointsPerUnit || 0}
        cadence={activity.cadence}
      />
    );
  };

  return (
    <div
      id={`activity-row-${activityId}`}
      className={cn(
        'relative flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between',
        !isLast && 'border-b border-border',
        isSurprise && 'bg-primary-soft/40'
      )}
    >
      {isSurprise && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
          Bonus
        </span>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg',
            isSurprise ? 'bg-primary-soft' : 'bg-secondary'
          )}
        >
          {isSurprise ? '🎁' : activityData?.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{activity.label}</p>
          <p className="text-xs text-muted-foreground">
            Target{' '}
            {typeof displayTarget === 'number'
              ? Number.isInteger(displayTarget)
                ? displayTarget.toLocaleString()
                : displayTarget.toLocaleString(undefined, { maximumFractionDigits: 1 })
              : displayTarget}{' '}
            {unitLabel}
            {cadenceSuffix}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2.5 sm:min-w-[13rem]">
        {renderControl()}
      </div>
    </div>
  );
}
