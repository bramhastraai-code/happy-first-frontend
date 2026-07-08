'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  Medal,
  Target,
  Trophy,
  XCircle,
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
  StreakData,
} from '@/lib/api/dailyLog';

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
  onFilterChange: (type: FilterType) => void;
  onActivitySelect: (activityId: string) => void;
  onBackToActivityList: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

function dayCellClasses(day: CalendarDay | ActivityCalendarDay) {
  return cn(
    'relative aspect-square w-full rounded-xl border text-xs font-semibold transition-all sm:text-sm',
    day.isFuture
      ? 'cursor-not-allowed border-border bg-secondary text-muted-foreground opacity-60'
      : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm',
    !day.isFuture &&
      (day.hasLog
        ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
        : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'),
    day.isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-surface'
  );
}

function CalendarDayCell({
  day,
  onClick,
}: {
  day: CalendarDay | ActivityCalendarDay;
  onClick: () => void;
}) {
  const dateLabel = day.date.split('T')[0];

  return (
    <button
      type="button"
      disabled={day.isFuture}
      onClick={onClick}
      className={dayCellClasses(day)}
      title={`${day.dayOfWeek}, ${dateLabel}${day.hasLog ? ' · Logged' : day.isFuture ? '' : ' · Missed'}`}
    >
      <span className="inline-flex h-full w-full flex-col items-center justify-center gap-0.5">
        <span className="text-[11px] leading-none sm:text-sm">{day.day}</span>
        {!day.isFuture && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full sm:hidden',
              day.hasLog ? 'bg-primary-foreground' : 'bg-rose-600'
            )}
            aria-hidden
          />
        )}
        {!day.isFuture &&
          (day.hasLog ? (
            <CheckCircle2 className="hidden h-3 w-3 opacity-90 sm:block" aria-hidden />
          ) : (
            <XCircle className="hidden h-3 w-3 opacity-80 sm:block" aria-hidden />
          ))}
        {day.isFuture && <Clock className="hidden h-3 w-3 opacity-50 sm:block" aria-hidden />}
      </span>
    </button>
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

function LeaderboardSection({
  title,
  subtitle,
  ranks,
  selectedProfileId,
  unit,
}: {
  title: string;
  subtitle?: string;
  ranks: NonNullable<CalendarData['leaderboard']>['ranks'];
  selectedProfileId?: string;
  unit?: string;
}) {
  return (
    <section className="section-card p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Medal className="h-5 w-5" />
        </span>
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {ranks.map((entry) => {
          const isYou = entry.user._id === selectedProfileId;
          const isTop3 = entry.rank <= 3;

          return (
            <li
              key={entry.user._id}
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
                {entry.value}
                {unit && <span className="text-xs font-normal text-muted-foreground">{unit}</span>}
              </p>
            </li>
          );
        })}
      </ul>
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
  onFilterChange,
  onActivitySelect,
  onBackToActivityList,
  onPreviousMonth,
  onNextMonth,
}: StreakCalendarViewProps) {
  const router = useRouter();
  const [legendOpen, setLegendOpen] = useState(false);

  const selectedActivityStreak = selectedActivityId
    ? streakData.activityStreaks.find((a) => a.activityId === selectedActivityId) ?? null
    : null;

  const activeCalendar = activityCalendarData || calendarData;
  const showCalendar =
    filterType === 'overall' || (filterType === 'activity' && selectedActivityId && !showActivityList);

  const handleDayClick = (day: CalendarDay | ActivityCalendarDay) => {
    if (day.isFuture) return;
    const dateStr = day.date.split('T')[0];
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

      {showCalendar && activeCalendar && (
        <>
          <section className="section-card overflow-visible p-4 sm:p-5">
            {filterType === 'activity' && selectedActivityId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBackToActivityList}
                className="mb-4 -ml-2 gap-2 text-primary hover:text-primary-hover"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to activities
              </Button>
            )}

            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onPreviousMonth}
                disabled={!activeCalendar.pagination.canGoPrevious}
                aria-label="Previous month"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1 text-center">
                {activityCalendarData?.activityName && (
                  <p className="truncate text-sm font-medium text-primary">{activityCalendarData.activityName}</p>
                )}
                <h3 className="text-lg font-semibold text-foreground">
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Logged
              </span>
              <button
                type="button"
                onClick={() => setLegendOpen((v) => !v)}
                className="text-primary hover:underline"
              >
                {legendOpen ? 'Hide legend' : 'Legend'}
              </button>
            </div>

            {legendOpen && (
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/50 p-3 text-xs sm:grid-cols-4">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary bg-primary text-primary-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  Logged
                </span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-300 bg-rose-50 text-rose-700">
                    <XCircle className="h-3.5 w-3.5" />
                  </span>
                  Missed
                </span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary bg-primary-soft ring-2 ring-primary ring-offset-1">
                    12
                  </span>
                  Today
                </span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary opacity-60">
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  Future
                </span>
              </div>
            )}

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

            <div className="mt-5 border-t border-border pt-4">
              {activityCalendarData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <StatTile label="Days logged" value={activityCalendarData.statistics?.daysLogged ?? 0} />
                    <StatTile label="Days missed" value={activityCalendarData.statistics?.daysNotLogged ?? 0} />
                    <StatTile
                      label="Completion"
                      value={`${activityCalendarData.statistics?.completionPercentage ?? 0}%`}
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
                      value={Number(activityCalendarData.statistics?.totalPoints ?? 0).toFixed(1)}
                      accent="primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <StatTile label="Days logged" value={calendarData?.statistics.daysLogged || 0} />
                  <StatTile label="Days missed" value={calendarData?.statistics.daysNotLogged || 0} />
                  <StatTile
                    label="Completion"
                    value={`${calendarData?.statistics.completionPercentage || 0}%`}
                    accent="success"
                  />
                </div>
              )}
            </div>
          </section>

          {(activityCalendarData?.leaderboard || calendarData?.leaderboard) && (
            <LeaderboardSection
              title={`${activeCalendar.monthName} leaderboard`}
              subtitle={activityCalendarData ? activityCalendarData.activityName : 'Overall performance'}
              ranks={
                (activityCalendarData?.leaderboard?.ranks || calendarData?.leaderboard?.ranks) ?? []
              }
              selectedProfileId={selectedProfileId}
              unit={activityUnit ?? undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
