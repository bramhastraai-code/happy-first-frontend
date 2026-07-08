'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  Lightbulb,
  Target,
  TrendingDown,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import { DateTime } from 'luxon';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { cn } from '@/lib/utils';
import { formatWeekRangeLabel } from '@/lib/utils/weekDate';
import type { WeekAnalysisData } from '@/lib/hooks/useWeekAnalysisData';
import type {
  DailyActivityLoss,
  PointLossesData,
  WeeklyActivityLoss,
} from '@/lib/api/dailyLog';
import type { ActivityAnalytics } from '@/lib/api/weeklyPlan';

interface WeekAnalysisViewProps {
  data: WeekAnalysisData;
  onRetry?: () => void;
}

function progressTone(percent: number) {
  if (percent >= 100) return 'bg-success';
  if (percent >= 70) return 'bg-primary';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-destructive';
}

function rankTone(percentile: number) {
  if (percentile >= 90) return 'bg-amber-500 text-white';
  if (percentile >= 70) return 'bg-success text-white';
  if (percentile >= 50) return 'bg-primary text-primary-foreground';
  return 'bg-secondary text-secondary-foreground';
}

function ActivityPerformanceCard({ activity }: { activity: ActivityAnalytics }) {
  const targetUnits =
    activity.cadence === 'daily' ? activity.targetValue * 7 : activity.targetValue;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{activity.activityLabel}</h3>
            {activity.rank != null && (
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', rankTone(activity.rankPercentile))}>
                #{activity.rank}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {activity.cadence} · {activity.unit}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums text-success">{activity.totalPointsAchieved.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">of {activity.pointsAllocated.toFixed(1)} pts</p>
        </div>
      </div>

      {activity.rank != null && (
        <div className="mt-4 rounded-xl bg-secondary/70 p-3">
          <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">Community rank</span>
            <span className="font-semibold text-foreground">
              Top {activity.rankPercentile}%
              <span className="text-muted-foreground"> · #{activity.rank}/{activity.totalParticipants}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className={cn('h-full rounded-full transition-all', progressTone(activity.rankPercentile))}
              style={{ width: `${Math.min(activity.rankPercentile, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium tabular-nums text-foreground">
            {activity.achievedUnits} / {targetUnits} {activity.unit}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className={cn('h-full rounded-full transition-all', progressTone(activity.achievementPercentage))}
            style={{ width: `${Math.min(activity.achievementPercentage, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground">{activity.achievementPercentage}% complete</span>
          {activity.pendingUnits > 0 && (
            <span className="text-primary">{activity.pendingUnits} {activity.unit} remaining</span>
          )}
        </div>
      </div>
    </article>
  );
}

function DailyLossCard({ activity }: { activity: DailyActivityLoss }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{activity.activity}</h3>
          <p className="text-xs text-muted-foreground">Daily · {activity.unit}</p>
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums text-success">{activity.earnedPoints.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">of {activity.potentialPoints.toFixed(1)} pts</p>
        </div>
      </div>

      {activity.pointsLost > 0 && (
        <div className="mt-3 rounded-xl border border-destructive/20 bg-red-50 px-3 py-2.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {activity.pointsLost.toFixed(1)} points lost
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activity.missedDays.length} missed · {activity.partialDays.length} incomplete days
          </p>
        </div>
      )}

      {activity.missedDays.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {activity.missedDays.map((day) => (
            <li
              key={day.date}
              className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-foreground">
                <XCircle className="h-3.5 w-3.5 text-destructive" />
                {DateTime.fromISO(day.date).toFormat('EEE, MMM dd')}
              </span>
              <span className="font-semibold text-destructive">-{day.pointsLost.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      )}

      {activity.partialDays.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {activity.partialDays.map((day) => (
            <li key={day.date} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {DateTime.fromISO(day.date).toFormat('EEE, MMM dd')}
                </span>
                <span className="font-semibold text-amber-700">-{day.pointsLost.toFixed(1)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {day.achieved} / {day.target} {day.unit} ({((day.achieved / day.target) * 100).toFixed(0)}%)
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function WeeklyLossCard({ activity }: { activity: WeeklyActivityLoss }) {
  const percent = activity.target > 0 ? (activity.achieved / activity.target) * 100 : 0;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{activity.activity}</h3>
          <p className="text-xs text-muted-foreground">
            Weekly target · {activity.daysLogged} days logged
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums text-success">{activity.earnedPoints.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">of {activity.potentialPoints.toFixed(1)} pts</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium tabular-nums">
            {activity.achieved.toFixed(1)} / {activity.target.toFixed(1)} {activity.unit}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-border">
          <div
            className={cn('h-full rounded-full', progressTone(percent))}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>

      {activity.achieved < activity.target && (
        <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {(activity.target - activity.achieved).toFixed(1)} {activity.unit} short of target
        </p>
      )}
    </article>
  );
}

function buildInsights(
  dailyActivities: DailyActivityLoss[],
  weeklyActivities: WeeklyActivityLoss[],
  pointLosses: PointLossesData
) {
  const tips: string[] = [];
  if (dailyActivities.some((a) => a.missedDays.length > 0)) {
    tips.push('Missed daily logs cost the most points — set a reminder for your usual log time.');
  }
  if (dailyActivities.some((a) => a.partialDays.length > 0)) {
    tips.push('Partial days still add up. Aim for full targets on your highest-point activities.');
  }
  if (weeklyActivities.some((a) => a.achieved < a.target)) {
    tips.push('Start weekly targets early in the week to avoid a last-minute rush.');
  }
  if (parseFloat(pointLosses.lossPercentage) < 20) {
    tips.push('Strong week — you kept point loss under 20%. Keep the momentum going.');
  }
  if (tips.length === 0) {
    tips.push('Log consistently and review this page each week to spot patterns early.');
  }
  return tips;
}

export function WeekAnalysisView({ data }: WeekAnalysisViewProps) {
  const { analytics, pointLosses, plan } = data;
  const [expanded, setExpanded] = useState({
    performance: true,
    dailyLosses: true,
    weeklyLosses: true,
    insights: true,
  });

  const weekLabel = formatWeekRangeLabel(pointLosses.weekStart, pointLosses.weekEnd);
  const achievementRate =
    pointLosses.totalPotentialPoints > 0
      ? ((pointLosses.totalPointsEarned / pointLosses.totalPotentialPoints) * 100).toFixed(1)
      : '0';

  const dailyActivities = useMemo(
    () => pointLosses.pointLossDetails.filter((a) => a.cadence === 'daily') as DailyActivityLoss[],
    [pointLosses.pointLossDetails]
  );
  const weeklyActivities = useMemo(
    () => pointLosses.pointLossDetails.filter((a) => a.cadence === 'weekly') as WeeklyActivityLoss[],
    [pointLosses.pointLossDetails]
  );
  const insights = useMemo(
    () => buildInsights(dailyActivities, weeklyActivities, pointLosses),
    [dailyActivities, weeklyActivities, pointLosses]
  );

  const toggle = (key: keyof typeof expanded) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <MainLayout>
      <PageHeader
        title="Week analysis"
        subtitle={weekLabel || 'Your weekly performance breakdown'}
        action={
          <span className="chip chip-active flex items-center gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" />
            {plan?.status === 'active' ? 'Active plan' : plan ? 'Past week' : 'No plan'}
          </span>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Points earned"
          value={pointLosses.totalPointsEarned.toFixed(1)}
          hint={`${achievementRate}% of potential`}
          icon={Zap}
          accent="green"
        />
        <StatCard
          label="Points lost"
          value={pointLosses.totalPointsLost.toFixed(1)}
          hint={`${pointLosses.lossPercentage}% loss rate`}
          icon={TrendingDown}
          accent="orange"
        />
        <StatCard
          label="Potential"
          value={pointLosses.totalPotentialPoints.toFixed(1)}
          hint="Maximum for the week"
          icon={Target}
          accent="neutral"
        />
        <StatCard
          label="Activities"
          value={pointLosses.summary.totalActivities}
          hint={`${pointLosses.summary.activitiesWithLosses} with losses`}
          icon={BarChart3}
          accent="orange"
        />
      </div>

      {analytics && (
        <CollapsibleSection
          title="Activity performance"
          subtitle={`${analytics.summary.totalPointsAchieved.toFixed(1)} of ${analytics.summary.totalPointsAllocated.toFixed(1)} pts achieved`}
          icon={Trophy}
          expanded={expanded.performance}
          onToggle={() => toggle('performance')}
          className="mb-4"
          contentClassName="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5"
        >
          {analytics.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities in this plan.</p>
          ) : (
            analytics.activities.map((activity) => (
              <ActivityPerformanceCard key={activity.activityId} activity={activity} />
            ))
          )}
        </CollapsibleSection>
      )}

      {!analytics && !plan && (
        <div className="section-card mb-4 p-5 text-sm text-muted-foreground">
          No weekly plan found for this date range. Point loss data is still shown below if you logged activities.
        </div>
      )}

      <CollapsibleSection
        title="Daily activity losses"
        subtitle={
          dailyActivities.length
            ? `${dailyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)} pts lost`
            : 'No daily activities'
        }
        icon={Calendar}
        expanded={expanded.dailyLosses}
        onToggle={() => toggle('dailyLosses')}
        className="mb-4"
        contentClassName="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5"
      >
        {dailyActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No daily activity losses this week.</p>
        ) : (
          dailyActivities.map((activity) => (
            <DailyLossCard key={activity.activityId} activity={activity} />
          ))
        )}
      </CollapsibleSection>

      {weeklyActivities.length > 0 && (
        <CollapsibleSection
          title="Weekly activity losses"
          subtitle={`${weeklyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)} pts lost`}
          icon={Target}
          expanded={expanded.weeklyLosses}
          onToggle={() => toggle('weeklyLosses')}
          className="mb-4"
          contentClassName="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5"
        >
          {weeklyActivities.map((activity) => (
            <WeeklyLossCard key={activity.activityId} activity={activity} />
          ))}
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title="Insights"
        subtitle="Actionable takeaways for next week"
        icon={Lightbulb}
        expanded={expanded.insights}
        onToggle={() => toggle('insights')}
        contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
      >
        <ul className="space-y-2">
          {insights.map((tip) => (
            <li key={tip} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {tip}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/tasks">Log today&apos;s tasks</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/previous-log">Fill missed logs</Link>
          </Button>
        </div>
      </CollapsibleSection>
    </MainLayout>
  );
}

export function WeekAnalysisError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <MainLayout>
      <div className="section-card mx-auto max-w-md p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-bold text-foreground">Couldn&apos;t load week analysis</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex justify-center">
          <Button onClick={onRetry}>Try again</Button>
        </div>
      </div>
    </MainLayout>
  );
}

export function WeekAnalysisLoading() {
  return (
    <MainLayout>
      <LoadingScreen fullScreen label="Loading week analysis…" />
    </MainLayout>
  );
}
