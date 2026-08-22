'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Medal,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { PageHeader, StatCard } from '@/components/ui/PageHeader';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ActivityCalendarData,
  ActivityCalendarDay,
  CalendarData,
  CalendarDay,
  LeaderboardData,
  StreakData,
} from '@/lib/api/dailyLog';
import type { WeightMoodHistoryPoint } from '@/lib/api/weeklyPlan';
import ActivityChart from '@/components/charts/ActivityChart';
import { formatWeekRangeShort } from '@/lib/utils/weekDate';
import { toLocalDateKey } from '@/lib/utils/calendarDate';
import { moodToNumeric, numericToMoodLabel } from '@/lib/utils/moodChart';

type FilterType = 'overall' | 'activity';

interface StreakCalendarViewProps {
  streakData: StreakData;
  filterType: FilterType;
  selectedActivityId: string;
  showActivityList: boolean;
  calendarData: CalendarData | null;
  activityCalendarData: ActivityCalendarData | null;
  isCalendarFetching: boolean;
  selectedProfileId?: string;
  weightMoodHistory?: WeightMoodHistoryPoint[];
  onFilterChange: (type: FilterType) => void;
  onActivitySelect: (activityId: string) => void;
  onBackToActivityList: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onJumpToCurrentMonth: () => void;
  onMonthlyLeaderboardPageChange: (page: number) => void;
  onAllTimeLeaderboardPageChange: (page: number) => void;
  onLeaderboardScopeChange?: (scope: 'monthly' | 'overall') => void;
}

type DayState = 'future' | 'logged' | 'pending' | 'missed' | 'idle';

function getDayState(day: CalendarDay | ActivityCalendarDay): DayState {
  if (day.isFuture) return 'future';
  if (day.hasLog) return 'logged';
  if (day.isToday) return 'pending';
  if (day.inPlan === false) return 'idle';
  return 'missed';
}

function formatPercent(value: string | number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function dayCellClasses(day: CalendarDay | ActivityCalendarDay) {
  const state = getDayState(day);

  return cn(
    'relative aspect-square w-full rounded-lg border text-xs font-semibold transition-colors sm:text-sm',
    state === 'future' &&
      'cursor-not-allowed border-border bg-secondary text-muted-foreground',
    state === 'logged' &&
      'cursor-pointer border-primary bg-primary text-primary-foreground hover:bg-primary/90',
    state === 'pending' &&
      'cursor-pointer border-primary bg-surface text-foreground',
    state === 'missed' &&
      'cursor-pointer border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100',
    state === 'idle' &&
      'cursor-pointer border-border bg-secondary/70 text-muted-foreground hover:bg-accent',
    day.isToday && 'ring-2 ring-primary ring-offset-1'
  );
}

function dayStateLabel(state: DayState): string {
  switch (state) {
    case 'logged':
      return 'Logged';
    case 'pending':
      return 'Today';
    case 'missed':
      return 'Missed';
    case 'idle':
      return 'No plan';
    default:
      return 'Future';
  }
}

function CalendarDayCell({
  day,
  onClick,
}: {
  day: CalendarDay | ActivityCalendarDay;
  onClick: () => void;
}) {
  const dateLabel = toLocalDateKey(day.date);
  const state = getDayState(day);

  return (
    <button
      type="button"
      disabled={day.isFuture}
      onClick={onClick}
      className={dayCellClasses(day)}
      title={`${day.dayOfWeek}, ${dateLabel}${state === 'future' ? '' : ` · ${dayStateLabel(state)}`}`}
    >
      <span className="inline-flex h-full w-full items-center justify-center">{day.day}</span>
      {(state === 'logged' || state === 'missed') && (
        <span
          className={cn(
            'absolute bottom-0.5 right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-white shadow-sm',
            state === 'logged' ? 'bg-emerald-500' : 'bg-rose-500'
          )}
        >
          {state === 'logged' ? (
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          ) : (
            <X className="h-2.5 w-2.5" strokeWidth={3} />
          )}
        </span>
      )}
    </button>
  );
}

const CATEGORY_ORDER = ['body', 'mind', 'soul'] as const;
const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  body: { label: 'Body', emoji: '💪' },
  mind: { label: 'Mind', emoji: '🧠' },
  soul: { label: 'Soul', emoji: '✨' },
};

function ActivityTotalsList({
  title,
  items,
}: {
  title: string;
  items: Array<{ activityId: string; name: string; unit: string; total: number; category?: string }>;
}) {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items
      .filter((item) => (item.category || 'body').toLowerCase() === category)
      .sort((a, b) => b.total - a.total),
  })).filter((group) => group.items.length > 0);

  const uncategorized = items.filter(
    (item) => !CATEGORY_ORDER.includes((item.category || 'body').toLowerCase() as (typeof CATEGORY_ORDER)[number])
  );

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity totals yet.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const meta = CATEGORY_META[group.category];
            return (
              <div key={group.category}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {meta.emoji} {meta.label}
                </p>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                  {group.items.map((item) => (
                    <li key={item.activityId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate font-medium text-foreground">{item.name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {item.total.toLocaleString()} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {uncategorized.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {uncategorized.map((item) => (
                <li key={item.activityId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium text-foreground">{item.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {item.total.toLocaleString()} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: 'primary' | 'success' | 'foreground' }) {
  const valueClass =
    accent === 'success' ? 'text-success' : accent === 'primary' ? 'text-primary' : 'text-foreground';

  return (
    <div className="rounded-xl bg-secondary/80 p-2.5 text-center sm:p-3">
      <p className={cn('text-lg font-bold tabular-nums sm:text-2xl', valueClass)}>{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function LeaderboardList({
  leaderboard,
  selectedProfileId,
  unit,
  isLoading,
  onPageChange,
}: {
  leaderboard: LeaderboardData;
  selectedProfileId?: string;
  unit?: string;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const { ranks, totalLeaders, pagination } = leaderboard;
  const startRank = totalLeaders === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRank = Math.min(pagination.page * pagination.limit, totalLeaders);

  return (
    <>
      {ranks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/50 px-4 py-10 text-center">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No rankings yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {ranks.map((entry) => {
            const isYou = entry.isCurrentUser || entry.user._id === selectedProfileId;
            const isTop3 = entry.rank <= 3;

            return (
              <li
                key={`${entry.user._id}-${entry.rank}`}
                className={cn('flex items-center gap-3 px-4 py-3', isYou && 'bg-accent/70')}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    entry.rank === 1 && 'bg-amber-100 text-amber-800',
                    entry.rank === 2 && 'bg-stone-200 text-stone-700',
                    entry.rank === 3 && 'bg-orange-100 text-orange-800',
                    !isTop3 && 'bg-secondary text-muted-foreground'
                  )}
                >
                  {isTop3 ? <Medal className="h-4 w-4" /> : entry.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-medium', isYou ? 'text-primary' : 'text-foreground')}>
                    {entry.user.name}
                  </p>
                  {isYou && (
                    <span className="mt-0.5 inline-block text-xs font-semibold text-primary">(you)</span>
                  )}
                </div>
                <p className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
                  <Award className="h-4 w-4 text-primary" />
                  {Number(entry.value).toFixed(2)}
                  {unit && <span className="text-xs font-normal text-muted-foreground">{unit}</span>}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {totalLeaders > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {startRank}–{endRank} of {totalLeaders}
            {isLoading && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasPreviousPage || isLoading}
              onClick={() => onPageChange(pagination.page - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="min-w-[4.5rem] text-center text-xs font-medium text-muted-foreground">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => onPageChange(pagination.page + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

type LeaderboardScope = 'monthly' | 'overall';

function isActualCurrentMonth(month: number, year: number): boolean {
  const now = new Date();
  return month === now.getMonth() + 1 && year === now.getFullYear();
}

function CombinedLeaderboardSection({
  monthLeaderboard,
  allTimeLeaderboard,
  month,
  monthName,
  year,
  canGoPreviousMonth,
  canGoNextMonth,
  activityName,
  selectedProfileId,
  unit,
  isLoading,
  onPreviousMonth,
  onNextMonth,
  onJumpToCurrentMonth,
  onMonthlyPageChange,
  onAllTimePageChange,
  onScopeChange,
}: {
  monthLeaderboard?: LeaderboardData;
  allTimeLeaderboard?: LeaderboardData;
  month: number;
  monthName: string;
  year: number;
  canGoPreviousMonth: boolean;
  canGoNextMonth: boolean;
  activityName?: string;
  selectedProfileId?: string;
  unit?: string;
  isLoading?: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onJumpToCurrentMonth: () => void;
  onMonthlyPageChange: (page: number) => void;
  onAllTimePageChange: (page: number) => void;
  onScopeChange?: (scope: LeaderboardScope) => void;
}) {
  const [scope, setScope] = useState<LeaderboardScope>('monthly');
  const isCurrentMonth = isActualCurrentMonth(month, year);

  const activeLeaderboard = scope === 'monthly' ? monthLeaderboard : allTimeLeaderboard;
  const onPageChange = scope === 'monthly' ? onMonthlyPageChange : onAllTimePageChange;
  const title =
    scope === 'monthly' ? `${monthName} leaderboard` : 'Overall leaderboard';
  const subtitle =
    scope === 'monthly'
      ? activityName || 'Points this month'
      : `All-time points · ${allTimeLeaderboard?.totalLeaders ?? 0} participants`;

  return (
    <section className="section-card p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Medal className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="section-title">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <ChipTabs
          tabs={[
            { id: 'monthly', label: 'Monthly' },
            { id: 'overall', label: 'Overall' },
          ]}
          active={scope}
          onChange={(id) => {
            const nextScope = id as LeaderboardScope;
            setScope(nextScope);
            onScopeChange?.(nextScope);
          }}
        />

        {scope === 'monthly' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-2xl border border-input bg-surface px-1.5 py-1.5">
              <button
                type="button"
                disabled={!canGoPreviousMonth || isLoading}
                onClick={onPreviousMonth}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1 px-1 text-center">
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {isCurrentMonth ? 'This month' : monthName}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {monthName} {year}
                </p>
              </div>
              <button
                type="button"
                disabled={!canGoNextMonth || isLoading}
                onClick={onNextMonth}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {!isCurrentMonth ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={onJumpToCurrentMonth}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-semibold text-primary transition-colors hover:bg-accent disabled:opacity-50 sm:h-9"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                This month
              </button>
            ) : null}
          </div>
        )}
      </div>

      {activeLeaderboard ? (
        <LeaderboardList
          leaderboard={activeLeaderboard}
          selectedProfileId={selectedProfileId}
          unit={unit}
          isLoading={isLoading}
          onPageChange={onPageChange}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading ranks…
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/50 px-4 py-10 text-center">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No rankings yet</p>
        </div>
      )}
    </section>
  );
}

export function StreakCalendarView({
  streakData,
  filterType,
  selectedActivityId,
  showActivityList,
  calendarData,
  activityCalendarData,
  isCalendarFetching,
  selectedProfileId,
  weightMoodHistory = [],
  onFilterChange,
  onActivitySelect,
  onBackToActivityList,
  onPreviousMonth,
  onNextMonth,
  onJumpToCurrentMonth,
  onMonthlyLeaderboardPageChange,
  onAllTimeLeaderboardPageChange,
  onLeaderboardScopeChange,
}: StreakCalendarViewProps) {
  const router = useRouter();

  const selectedActivityStreak = selectedActivityId
    ? streakData.activityStreaks.find((a) => a.activityId === selectedActivityId) ?? null
    : null;

  const activeCalendar = activityCalendarData || calendarData;
  const showCalendar =
    filterType === 'overall' || (filterType === 'activity' && selectedActivityId && !showActivityList);

  const handleDayClick = (day: CalendarDay | ActivityCalendarDay) => {
    if (day.isFuture) return;
    const dateStr = toLocalDateKey(day.date);
    if (day.hasLog) {
      router.push(`/home?date=${dateStr}`);
      return;
    }
    router.push(`/previous-log?date=${dateStr}`);
  };

  const currentStreak =
    filterType === 'activity' && selectedActivityStreak
      ? selectedActivityStreak.currentStreak
      : streakData.overallStreak.currentStreak;

  const longestStreak =
    filterType === 'activity' && selectedActivityStreak
      ? selectedActivityStreak.longestStreak
      : streakData.overallStreak.longestStreak;

  const totalLogged =
    filterType === 'activity' && selectedActivityStreak
      ? selectedActivityStreak.totalDaysLogged
      : streakData.overallStreak.totalDaysLogged;

  const calendarDays = activeCalendar?.calendarDays ?? [];
  const firstDayOffset = calendarDays.length > 0 ? new Date(calendarDays[0].date).getDay() : 0;
  const activityUnit = activityCalendarData?.calendarDays.find((d) => d.unit)?.unit;

  const weightChartData = weightMoodHistory
    .filter((point) => typeof point.weight === 'number')
    .map((point) => ({
              label: formatWeekRangeShort(point.weekStart, point.weekEnd),
              value: point.weight as number,
              tooltipLabel: formatWeekRangeShort(point.weekStart, point.weekEnd),
              displayValue: `${point.weight} kg`,
    }));

  const moodChartData = weightMoodHistory
    .map((point) => {
      const numeric = moodToNumeric(point.mood);
      if (numeric == null || !point.mood) return null;
      const weekLabel = formatWeekRangeShort(point.weekStart, point.weekEnd);
      const moodLabel = point.mood.charAt(0).toUpperCase() + point.mood.slice(1);
      return {
        label: weekLabel,
        value: numeric,
        tooltipLabel: weekLabel,
        displayValue: moodLabel,
      };
    })
    .filter((point): point is { label: string; value: number; tooltipLabel: string; displayValue: string } =>
      point != null
    );

  const fourWeekTrendChartData =
    calendarData?.fourWeekTrend?.map((week) => ({
      label: formatWeekRangeShort(week.weekStart, week.weekEnd),
      value: week.percentPointsEarned,
      tooltipLabel: formatWeekRangeShort(week.weekStart, week.weekEnd),
      displayValue: `${formatPercent(week.percentPointsEarned)}%`,
    })) ?? [];

  const weeklyAverages = calendarData?.weeklyAverages;
  const activityTotals = calendarData?.activityTotals;

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <PageHeader
        title="Streak calendar"
        subtitle="Track your consistency day by day and spot gaps before they break your streak."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <StatCard
          label="Current streak"
          value={`${currentStreak} days`}
          hint="Keep logging to grow it"
          icon={Flame}
          accent="orange"
        />
        <StatCard
          label="Longest streak"
          value={`${longestStreak} days`}
          hint={`${totalLogged} days logged total`}
          icon={Trophy}
          accent="green"
        />
      </div>

      <section className="section-card space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Target className="h-5 w-5" />
          </span>
          <div>
            <h2 className="section-title">View streak by</h2>
            <p className="text-xs text-muted-foreground">Overall daily log or a single activity</p>
          </div>
        </div>

        <ChipTabs
          tabs={[
            { id: 'activity', label: 'By activity' },
            { id: 'overall', label: 'Overall' },
          ]}
          active={filterType}
          onChange={(id) => onFilterChange(id as FilterType)}
        />

        {filterType === 'activity' && showActivityList && (
          <div className="space-y-3 pt-1">
            <p className="text-sm font-medium text-foreground">Choose an activity</p>
            {streakData.activityStreaks.length > 0 ? (
              <ul className="space-y-2">
                {streakData.activityStreaks.map((activity) => (
                  <li key={activity.activityId}>
                    <button
                      type="button"
                      onClick={() => onActivitySelect(activity.activityId)}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Flame className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground group-hover:text-primary">
                          {activity.activityName}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-medium text-primary">{activity.currentStreak} day streak</span>
                          <span>Best {activity.longestStreak}</span>
                          <span>{activity.totalDaysLogged} logged</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/50 px-4 py-10 text-center">
                <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No activities yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Create a plan to start tracking activity streaks.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {filterType === 'overall' && (weightChartData.length > 0 || moodChartData.length > 0) && (
        <section className="section-card space-y-5 p-4 sm:p-5">
          <div>
            <h2 className="section-title">Weight & mood trends</h2>
            <p className="text-xs text-muted-foreground">Weekly starting weight and mood over recent plans</p>
          </div>

          {weightChartData.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Weight (kg)</h3>
              <ActivityChart
                data={weightChartData}
                variant="line"
                height={200}
                color="#2563eb"
                tooltipUnit="kg"
                showLineLabels
                enableInsideZoom={false}
              />
            </div>
          )}

          {moodChartData.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Weekly mood</h3>
              <ActivityChart
                data={moodChartData}
                variant="line"
                height={200}
                color="#ea580c"
                tooltipUnit=""
                showLineLabels
                enableInsideZoom={false}
                yAxisLabelFormatter={(value) => numericToMoodLabel(value)}
              />
            </div>
          )}
        </section>
      )}

      {showCalendar && activeCalendar && (
        <>
          <section className="section-card overflow-visible p-4 sm:p-5">
            {filterType === 'activity' && selectedActivityId && (
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBackToActivityList}
                  className="-ml-2 gap-2 self-start text-primary hover:text-primary-hover"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to activities
                </Button>
                {streakData.activityStreaks.length > 0 && (
                  <label className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-xs sm:justify-end">
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">Activity</span>
                    <select
                      value={selectedActivityId}
                      onChange={(e) => onActivitySelect(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {streakData.activityStreaks.map((activity) => (
                        <option key={activity.activityId} value={activity.activityId}>
                          {activity.activityName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onPreviousMonth}
                disabled={!activeCalendar.pagination.canGoPrevious}
                aria-label="Previous month"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0 flex-1 text-center">
                {activityCalendarData?.activityName && (
                  <p className="truncate text-sm font-medium text-primary">{activityCalendarData.activityName}</p>
                )}
                <h3 className="text-sm font-semibold text-foreground sm:text-lg">
                  {activeCalendar.monthName} {activeCalendar.year}
                </h3>
                {isCalendarFetching && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onNextMonth}
                disabled={!activeCalendar.pagination.canGoNext}
                aria-label="Next month"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-end gap-3 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                Logged
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-white">
                  <X className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                Missing
              </span>
            </div>

            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: firstDayOffset }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}
              {calendarDays.map((day) => (
                <CalendarDayCell key={day.date} day={day} onClick={() => handleDayClick(day)} />
              ))}
            </div>

            {filterType === 'activity' && selectedActivityStreak && (
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-primary/20 bg-primary-soft/60 p-3">
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums text-primary">{selectedActivityStreak.currentStreak}</p>
                  <p className="text-[11px] text-muted-foreground">Current streak</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums text-foreground">{selectedActivityStreak.longestStreak}</p>
                  <p className="text-[11px] text-muted-foreground">Longest</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums text-foreground">{selectedActivityStreak.totalDaysLogged}</p>
                  <p className="text-[11px] text-muted-foreground">Days logged</p>
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-border pt-4">
              {activityCalendarData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <StatTile label="Days logged" value={activityCalendarData.statistics?.daysLogged ?? 0} />
                    <StatTile label="Days missed" value={activityCalendarData.statistics?.daysNotLogged ?? 0} />
                    <StatTile
                      label="% Points Earned"
                      value={`${formatPercent(activityCalendarData.statistics?.completionPercentage)}%`}
                      accent="success"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatTile
                      label={`Total ${activityUnit || 'value'}`}
                      value={activityCalendarData.statistics?.totalValue ?? 0}
                    />
                    <StatTile
                      label="Points earned"
                      value={formatPercent(activityCalendarData.statistics?.totalPoints)}
                      accent="primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <StatTile label="Days logged" value={calendarData?.statistics.daysLogged || 0} />
                    <StatTile label="Days missed" value={calendarData?.statistics.daysNotLogged || 0} />
                    <StatTile
                      label="% Points Earned"
                      value={`${formatPercent(calendarData?.statistics.completionPercentage)}%`}
                      accent="success"
                    />
                  </div>
                  {weeklyAverages && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                      <StatTile
                        label={`${weeklyAverages.monthLabel} Weekly Average`}
                        value={`${formatPercent(weeklyAverages.monthWeeklyAveragePercent)}% Points Earned`}
                        accent="primary"
                      />
                      <StatTile
                        label="Overall Weekly Average"
                        value={`${formatPercent(weeklyAverages.overallWeeklyAveragePercent)}% Points Earned`}
                        accent="primary"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {filterType === 'overall' && activityTotals && (
            <section className="section-card space-y-4 p-4 sm:p-5">
              <div>
                <h2 className="section-title">Overall activity totals</h2>
                <p className="text-xs text-muted-foreground">Cumulative activity values this month and lifetime</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ActivityTotalsList title="This month" items={activityTotals.month} />
                <ActivityTotalsList title="Lifetime" items={activityTotals.lifetime} />
              </div>
            </section>
          )}

          {filterType === 'overall' && fourWeekTrendChartData.length > 0 && (
            <section className="section-card space-y-4 p-4 sm:p-5">
              <div>
                <h2 className="section-title">4-week analysis</h2>
                <p className="text-xs text-muted-foreground">% Points Earned over the last four completed weeks</p>
              </div>
              <ActivityChart
                data={fourWeekTrendChartData}
                variant="bar"
                height={200}
                tooltipUnit="% Points Earned"
                showBarLabels
                enableInsideZoom={false}
              />
            </section>
          )}

          {(activityCalendarData?.leaderboard ||
            calendarData?.leaderboard ||
            activityCalendarData?.allTimeLeaderboard ||
            calendarData?.allTimeLeaderboard) &&
            activeCalendar && (
            <CombinedLeaderboardSection
              monthLeaderboard={activityCalendarData?.leaderboard || calendarData?.leaderboard}
              allTimeLeaderboard={
                activityCalendarData?.allTimeLeaderboard || calendarData?.allTimeLeaderboard
              }
              month={activeCalendar.month}
              monthName={activeCalendar.monthName}
              year={activeCalendar.year}
              canGoPreviousMonth={activeCalendar.pagination.canGoPrevious}
              canGoNextMonth={activeCalendar.pagination.canGoNext}
              activityName={activityCalendarData?.activityName}
              selectedProfileId={selectedProfileId}
              unit={activityCalendarData ? activityUnit ?? undefined : 'pts'}
              isLoading={isCalendarFetching}
              onPreviousMonth={onPreviousMonth}
              onNextMonth={onNextMonth}
              onJumpToCurrentMonth={onJumpToCurrentMonth}
              onMonthlyPageChange={onMonthlyLeaderboardPageChange}
              onAllTimePageChange={onAllTimeLeaderboardPageChange}
              onScopeChange={onLeaderboardScopeChange}
            />
          )}
        </>
      )}
    </div>
  );
}
