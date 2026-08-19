'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
import {
  canNavigateToNextWeek,
  formatWeekRangeLabel,
  formatWeekRangeShort,
  shiftWeekStartISO,
} from '@/lib/utils/weekDate';
import type { WeekAnalysisData } from '@/lib/hooks/useWeekAnalysisData';
import type {
  DailyActivityLoss,
  PointLossesData,
  WeeklyActivityLoss,
} from '@/lib/api/dailyLog';
import type { ActivityAnalytics } from '@/lib/api/weeklyPlan';
import ActivityChart from '@/components/charts/ActivityChart';

interface WeekAnalysisViewProps {
  data: WeekAnalysisData;
  onRetry?: () => void;
  onWeekChange?: (weekStart: string) => void;
}

function progressTone(percent: number) {
  if (percent >= 100) return 'bg-success';
  if (percent >= 70) return 'bg-primary';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-destructive';
}

function ActivityPerformanceCard({ activity }: { activity: ActivityAnalytics }) {
  const targetUnits =
    activity.cadence === 'daily' ? activity.targetValue * 7 : activity.targetValue;

  return (
    <article className="rounded-lg border border-border bg-surface px-2.5 py-2">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">{activity.activityLabel}</h3>
        {activity.rank != null && activity.totalParticipants > 0 && (
          <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground">
            {activity.rank} / {activity.totalParticipants}
          </span>
        )}
        <p className="ml-auto shrink-0 text-sm font-bold tabular-nums text-success">
          {activity.totalPointsAchieved.toFixed(1)}
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
            / {activity.pointsAllocated.toFixed(1)}
          </span>
        </p>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className={cn('h-full rounded-full transition-all', progressTone(activity.achievementPercentage))}
            style={{ width: `${Math.min(activity.achievementPercentage, 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
          {activity.achievedUnits} / {targetUnits} {activity.unit}
        </span>
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
          {activity.pointsLost > 0 ? (
            <>
              <p className="font-bold tabular-nums text-destructive">-{activity.pointsLost.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">points lost</p>
              <p className="mt-1 text-xs tabular-nums text-success">
                {activity.earnedPoints.toFixed(1)} earned
              </p>
            </>
          ) : (
            <>
              <p className="font-bold tabular-nums text-success">{activity.earnedPoints.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">of {activity.potentialPoints.toFixed(1)}% Points Earned</p>
            </>
          )}
        </div>
      </div>

      {activity.pointsLost > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {activity.missedDays.length} missed · {activity.partialDays.length} incomplete days
        </p>
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
          {activity.pointsLost > 0 ? (
            <>
              <p className="font-bold tabular-nums text-destructive">-{activity.pointsLost.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">points lost</p>
              <p className="mt-1 text-xs tabular-nums text-success">
                {activity.earnedPoints.toFixed(1)} earned
              </p>
            </>
          ) : (
            <>
              <p className="font-bold tabular-nums text-success">{activity.earnedPoints.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">of {activity.potentialPoints.toFixed(1)}% Points Earned</p>
            </>
          )}
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

export function WeekAnalysisView({ data, onWeekChange }: WeekAnalysisViewProps) {
  const { analytics, pointLosses, plan, fourWeekTrend } = data;
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

  const canGoNext = canNavigateToNextWeek(pointLosses.weekStart);
  const prevWeekStart = shiftWeekStartISO(pointLosses.weekStart, -1);
  const nextWeekStart = shiftWeekStartISO(pointLosses.weekStart, 1);

  const fourWeekTrendChartData = fourWeekTrend.map((week) => ({
    label: formatWeekRangeShort(week.weekStart, week.weekEnd),
    value: week.percentPointsEarned,
    tooltipLabel: formatWeekRangeShort(week.weekStart, week.weekEnd),
  }));
  const selectedTrendIndex = fourWeekTrend.findIndex((week) => week.weekStart === data.weekStart);

  return (
    <MainLayout>
      <PageHeader
        title="Week analysis"
        subtitle={
          weekLabel
            ? `${weekLabel} · completed week only`
            : 'Historical breakdown for completed weeks'
        }
        action={
          onWeekChange ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onWeekChange(prevWeekStart)}
                className="h-8 gap-1 px-2"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              {canGoNext ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onWeekChange(nextWeekStart)}
                  className="h-8 gap-1 px-2"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled className="h-8 gap-1 px-2">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {plan ? 'Past week' : 'No plan'}
            </span>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Points lost"
          value={pointLosses.totalPointsLost.toFixed(1)}
          hint={`${pointLosses.lossPercentage}% loss rate`}
          icon={TrendingDown}
          accent="orange"
        />
        <StatCard
          label="Points earned"
          value={pointLosses.totalPointsEarned.toFixed(1)}
          hint={`${achievementRate}% Points Earned`}
          icon={Zap}
          accent="green"
        />
        <StatCard
          label="Potential"
          value={pointLosses.totalPotentialPoints.toFixed(1)}
          hint="Max % Points Earned this week"
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

      {fourWeekTrendChartData.length > 0 && (
        <section className="section-card mb-4 space-y-4 p-4 sm:p-5">
          <div>
            <h2 className="section-title">4-week analysis</h2>
            <p className="text-xs text-muted-foreground">
              Points lost then points earned. Tap a week to open it.
            </p>
          </div>
          <ActivityChart
            data={fourWeekTrendChartData}
            variant="bar"
            height={220}
            selectedIndex={selectedTrendIndex}
            showBarLabels
            enableInsideZoom={false}
            barGroups={[
              {
                name: 'Points lost',
                color: '#e11d48',
                values: fourWeekTrend.map((week) => Number(week.pointsLost ?? 0)),
              },
              {
                name: 'Points earned',
                color: '#16a34a',
                values: fourWeekTrend.map((week) => Number(week.pointsEarned ?? 0)),
              },
            ]}
            onBarClick={(_, index) => {
              const week = fourWeekTrend[index];
              if (week?.weekStart && onWeekChange) onWeekChange(week.weekStart);
            }}
          />
        </section>
      )}

      {analytics && (
        <CollapsibleSection
          title="Activity performance"
          subtitle={`${analytics.summary.totalPointsAchieved.toFixed(1)} of ${analytics.summary.totalPointsAllocated.toFixed(1)}% Points Earned`}
          icon={Trophy}
          expanded={expanded.performance}
          onToggle={() => toggle('performance')}
          className="mb-4"
          contentClassName="space-y-2 px-3 pb-3 sm:px-4 sm:pb-4"
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
            ? `${dailyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)}% Points Earned lost`
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
          subtitle={`${weeklyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)}% Points Earned lost`}
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
