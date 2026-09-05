'use client';

import { useMemo, useState, type ReactNode } from 'react';
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

const CATEGORY_ORDER = ['body', 'mind', 'soul'] as const;
type ActivityCategory = (typeof CATEGORY_ORDER)[number];

const CATEGORY_META: Record<ActivityCategory, { label: string; emoji: string }> = {
  body: { label: 'Body', emoji: '💪' },
  mind: { label: 'Mind', emoji: '🧠' },
  soul: { label: 'Soul', emoji: '✨' },
};

function buildCategoryById(activityList: { _id: string; category?: string }[]) {
  return new Map(
    activityList.map((activity) => [
      activity._id,
      ((activity.category || 'body').toLowerCase() as ActivityCategory),
    ])
  );
}

function groupByCategory<T extends { activityId: string }>(
  items: T[],
  categoryById: Map<string, ActivityCategory>
) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter(
      (item) => (categoryById.get(item.activityId) ?? 'body') === category
    ),
  })).filter((group) => group.items.length > 0);
}

function CategoryGroupGrid<T extends { activityId: string }>({
  items,
  categoryById,
  renderItem,
}: {
  items: T[];
  categoryById: Map<string, ActivityCategory>;
  renderItem: (item: T) => ReactNode;
}) {
  const grouped = groupByCategory(items, categoryById);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {grouped.map((group) => {
        const meta = CATEGORY_META[group.category];
        return (
          <div
            key={group.category}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="flex items-center gap-1.5 border-b border-border bg-secondary/40 px-2.5 py-1.5">
              <span className="text-sm" aria-hidden>
                {meta.emoji}
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                {meta.label}
              </h3>
            </div>
            <div className="space-y-2 p-2">
              {group.items.map((item) => (
                <div key={item.activityId}>{renderItem(item)}</div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface WeekAnalysisViewProps {
  data: WeekAnalysisData;
  onRetry?: () => void;
  onWeekChange?: (weekStart: string) => void;
}

function formatPoints(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function formatPercentValue(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return Math.min(100, Math.max(0, n)).toFixed(2);
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
    <article className="rounded-lg border border-border bg-background px-2.5 py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">{activity.activityLabel}</h3>
          {activity.rank != null && activity.totalParticipants > 0 && (
            <p
              className="mt-0.5 text-[10px] text-muted-foreground"
              title="Your rank among all profiles who logged this activity this week"
            >
              Community rank{' '}
              <span className="font-semibold tabular-nums text-foreground">
                {activity.rank} of {activity.totalParticipants}
              </span>
            </p>
          )}
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums text-success">
          {formatPoints(activity.totalPointsAchieved)}
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
            / {formatPoints(activity.pointsAllocated)}
          </span>
        </p>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className={cn('h-full rounded-full transition-all', progressTone(activity.achievementPercentage))}
            style={{ width: `${Math.min(100, activity.achievementPercentage)}%` }}
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
  const earnedPercent =
    activity.potentialPoints > 0 ? (activity.earnedPoints / activity.potentialPoints) * 100 : 0;
  const hasDayDetails = activity.missedDays.length > 0 || activity.partialDays.length > 0;

  return (
    <article className="rounded-lg border border-border bg-background px-2.5 py-2">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">{activity.activity}</h3>
        <p className="ml-auto shrink-0 text-sm font-bold tabular-nums text-destructive">
          -{formatPoints(activity.pointsLost)}
        </p>
      </div>

      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Daily · {activity.unit}
        {hasDayDetails && (
          <>
            {' '}
            · {activity.missedDays.length} missed · {activity.partialDays.length} incomplete
          </>
        )}
      </p>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className={cn('h-full rounded-full transition-all', progressTone(earnedPercent))}
            style={{ width: `${Math.min(earnedPercent, 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
          {formatPoints(activity.earnedPoints)} / {formatPoints(activity.potentialPoints)}
        </span>
      </div>

      {hasDayDetails && (
        <details className="mt-1.5 group">
          <summary className="cursor-pointer list-none text-[11px] font-medium text-primary [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show missed days</span>
            <span className="hidden group-open:inline">Hide missed days</span>
          </summary>
          <div className="mt-1.5 space-y-1">
            {activity.missedDays.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-md bg-secondary/70 px-2 py-1 text-[11px]"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-foreground">
                  <XCircle className="h-3 w-3 shrink-0 text-destructive" />
                  {DateTime.fromISO(day.date).toFormat('EEE, MMM dd')}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-destructive">
                  -{formatPoints(day.pointsLost)}
                </span>
              </div>
            ))}
            {activity.partialDays.map((day) => (
              <div
                key={day.date}
                className="rounded-md border border-amber-200/80 bg-amber-50/80 px-2 py-1 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {DateTime.fromISO(day.date).toFormat('EEE, MMM dd')}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-amber-700">
                    -{formatPoints(day.pointsLost)}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {day.achieved} / {day.target} {day.unit} (
                  {day.target > 0
                    ? Math.min(100, Math.round((day.achieved / day.target) * 100))
                    : 0}
                  %)
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}

function WeeklyLossCard({ activity }: { activity: WeeklyActivityLoss }) {
  const percent =
    activity.target > 0
      ? Math.min(100, (activity.achieved / activity.target) * 100)
      : 0;

  return (
    <article className="rounded-lg border border-border bg-background px-2.5 py-2">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">{activity.activity}</h3>
        <p className="ml-auto shrink-0 text-sm font-bold tabular-nums text-destructive">
          -{formatPoints(activity.pointsLost)}
        </p>
      </div>

      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Weekly · {activity.unit} · {activity.daysLogged} days logged
      </p>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className={cn('h-full rounded-full transition-all', progressTone(percent))}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
          {activity.achieved.toFixed(1)} / {activity.target.toFixed(1)} {activity.unit}
        </span>
      </div>

      {activity.achieved < activity.target && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
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
  const { analytics, pointLosses, plan, fourWeekTrend, activityList } = data;
  const [expanded, setExpanded] = useState({
    performance: true,
    dailyLosses: true,
    weeklyLosses: true,
    insights: true,
  });

  const weekLabel = formatWeekRangeLabel(pointLosses.weekStart, pointLosses.weekEnd);
  const achievementRate =
    pointLosses.totalPotentialPoints > 0
      ? formatPercentValue(
          (pointLosses.totalPointsEarned / pointLosses.totalPotentialPoints) * 100
        )
      : '0.00';

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
  const categoryById = useMemo(() => buildCategoryById(activityList), [activityList]);

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
          value={formatPoints(pointLosses.totalPointsLost)}
          hint={`${formatPercentValue(pointLosses.lossPercentage)}% loss rate`}
          icon={TrendingDown}
          accent="orange"
        />
        <StatCard
          label="Points earned"
          value={formatPoints(pointLosses.totalPointsEarned)}
          hint={`${achievementRate}% Points Earned`}
          icon={Zap}
          accent="green"
        />
        <StatCard
          label="Potential"
          value={formatPoints(pointLosses.totalPotentialPoints)}
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

      <CollapsibleSection
        title="Daily activity losses"
        subtitle={
          dailyActivities.length
            ? `${formatPoints(dailyActivities.reduce((sum, a) => sum + a.pointsLost, 0))}% Points Earned lost`
            : 'No daily activities'
        }
        icon={Calendar}
        expanded={expanded.dailyLosses}
        onToggle={() => toggle('dailyLosses')}
        className="mb-4"
        contentClassName="space-y-2 px-3 pb-3 sm:px-4 sm:pb-4"
      >
        {dailyActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No daily activity losses this week.</p>
        ) : (
          <CategoryGroupGrid
            items={dailyActivities}
            categoryById={categoryById}
            renderItem={(activity) => <DailyLossCard activity={activity} />}
          />
        )}
      </CollapsibleSection>

      {weeklyActivities.length > 0 && (
        <CollapsibleSection
          title="Weekly activity losses"
          subtitle={`${formatPoints(weeklyActivities.reduce((sum, a) => sum + a.pointsLost, 0))}% Points Earned lost`}
          icon={Target}
          expanded={expanded.weeklyLosses}
          onToggle={() => toggle('weeklyLosses')}
          className="mb-4"
          contentClassName="space-y-2 px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <CategoryGroupGrid
            items={weeklyActivities}
            categoryById={categoryById}
            renderItem={(activity) => <WeeklyLossCard activity={activity} />}
          />
        </CollapsibleSection>
      )}

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
          subtitle={`${formatPoints(analytics.summary.totalPointsAchieved)} of ${formatPoints(analytics.summary.totalPointsAllocated)}% Points Earned · grouped by Mind, Body, Soul`}
          icon={Trophy}
          expanded={expanded.performance}
          onToggle={() => toggle('performance')}
          className="mb-4"
          contentClassName="space-y-2 px-3 pb-3 sm:px-4 sm:pb-4"
        >
          {analytics.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities in this plan.</p>
          ) : (
            <CategoryGroupGrid
              items={analytics.activities}
              categoryById={categoryById}
              renderItem={(activity) => <ActivityPerformanceCard activity={activity} />}
            />
          )}
        </CollapsibleSection>
      )}

      {!analytics && !plan && (
        <div className="section-card mb-4 p-5 text-sm text-muted-foreground">
          No weekly plan found for this date range. Point loss data is still shown above if you logged activities.
        </div>
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
