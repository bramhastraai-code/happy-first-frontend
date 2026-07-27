'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateTime } from 'luxon';
import {
  ArrowRight,
  CalendarDays,
  Gift,
  ListChecks,
  Lock,
  Pencil,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { weeklyPlanAPI, type WeeklyPlan, type WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { activityAPI, type Activity } from '@/lib/api/activity';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { resolveActivityIcon } from '@/lib/utils/activityIcon';
import { cn } from '@/lib/utils';

type ActivityFilter = 'all' | 'daily' | 'weekly';

function formatWeekRange(weekStart: string, weekEnd: string) {
  const start = DateTime.fromISO(weekStart);
  const end = DateTime.fromISO(weekEnd);
  return `${start.toFormat('MMM d')} – ${end.toFormat('MMM d, yyyy')}`;
}

function daysUntilStart(weekStart: string) {
  const start = DateTime.fromISO(weekStart).startOf('day');
  const today = DateTime.local().startOf('day');
  return Math.max(0, Math.ceil(start.diff(today, 'days').days));
}

function getTotalPotentialPoints(plan: WeeklyPlan) {
  return plan.activities.reduce((total, activity) => {
    if (activity.cadence === 'daily') {
      return total + (activity.pointsPerUnit || 0) * 7;
    }
    return total + (activity.pointsPerUnit || 0) * activity.targetValue;
  }, 0);
}

function HeroStat({ label, value, accent }: { label: string; value: string | number; accent?: 'primary' | 'success' | 'foreground' }) {
  const valueClass =
    accent === 'success' ? 'text-success' : accent === 'primary' ? 'text-primary' : 'text-foreground';

  return (
    <div className="rounded-xl border border-border/60 bg-surface/80 p-3 text-center backdrop-blur-sm">
      <p className={cn('text-xl font-bold tabular-nums sm:text-2xl', valueClass)}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function ActivityPlanCard({
  activity,
  activities,
}: {
  activity: WeeklyPlanActivity;
  activities: Activity[];
}) {
  const activityId = activity.activity;
  const meta = activities.find((a) => a._id === activityId);
  const isSurprise = Boolean(activity.isSurpriseActivity);
  const isDaily = activity.cadence === 'daily';
  const maxPoints = isDaily
    ? (activity.pointsPerUnit || 0) * 7
    : (activity.pointsPerUnit || 0) * activity.targetValue;
  const icon = resolveActivityIcon(activities, activityId, activity.label || meta?.name);

  return (
    <article
      className={cn(
        'relative rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]',
        isSurprise
          ? 'border-amber-300/80 bg-gradient-to-br from-amber-50 via-orange-50/80 to-surface shadow-[var(--shadow-card)]'
          : 'border-border bg-surface shadow-[var(--shadow-card)]'
      )}
    >
      {isSurprise && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-md">
          <Gift className="h-3 w-3" />
          Surprise
        </span>
      )}

      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl',
            isSurprise ? 'bg-amber-100' : 'bg-primary-soft'
          )}
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">{activity.label || meta?.name}</h4>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                isDaily ? 'bg-primary-soft text-primary' : 'bg-secondary text-muted-foreground'
              )}
            >
              {activity.cadence}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activity.targetValue} {activity.unit}
            {isDaily ? '/day' : '/week'}
            <span className="mx-1.5 text-border">·</span>
            {activity.pointsPerUnit?.toFixed(1)} pts/{isDaily ? 'day' : activity.unit}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-primary sm:text-xl">{maxPoints.toFixed(0)}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">pts max</p>
        </div>
      </div>
    </article>
  );
}

export default function UpcomingPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken || !user) {
      router.push('/login');
      return;
    }

    const fetchWeeklyPlan = async () => {
      try {
        setLoading(true);
        const [plan, activityResponse] = await Promise.all([
          weeklyPlanAPI.getUpcomingPlan(),
          activityAPI.getList(),
        ]);
        setActivities(activityResponse.data.data);
        setWeeklyPlan(plan);
        setError('');
      } catch (err: unknown) {
        console.error('Failed to fetch weekly plan:', err);
        setError('Failed to load upcoming plan. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchWeeklyPlan();
  }, [accessToken, user, router, isHydrated]);

  const dailyActivities = useMemo(
    () => weeklyPlan?.activities.filter((a) => a.cadence === 'daily') ?? [],
    [weeklyPlan]
  );
  const weeklyActivities = useMemo(
    () => weeklyPlan?.activities.filter((a) => a.cadence === 'weekly') ?? [],
    [weeklyPlan]
  );

  const filteredActivities = useMemo(() => {
    if (!weeklyPlan) return [];
    if (activityFilter === 'daily') return dailyActivities;
    if (activityFilter === 'weekly') return weeklyActivities;
    return weeklyPlan.activities;
  }, [weeklyPlan, activityFilter, dailyActivities, weeklyActivities]);

  const daysLeft = weeklyPlan ? daysUntilStart(weeklyPlan.weekStart) : 0;
  const maxPoints = weeklyPlan ? getTotalPotentialPoints(weeklyPlan) : 0;
  const unlockedSets =
    weeklyPlan?.unlockedSets?.length ?? weeklyPlan?.unloockedSets?.length ?? 0;

  if (!isHydrated || loading) {
    return (
      <MainLayout>
        <LoadingScreen fullScreen label="Loading upcoming plan…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="page-container space-y-5 sm:space-y-6">
        <PageHeader
          title="Upcoming plan"
          subtitle="Your goals for next week — review before they go live."
        />

        {error && (
          <div className="section-card flex flex-col items-center px-6 py-10 text-center">
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-destructive">
              <CalendarDays className="h-6 w-6" />
            </span>
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}

        {!error && weeklyPlan && (
          <>
            <section className="section-card gradient-orange overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Next week
                    </span>
                    <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {formatWeekRange(weeklyPlan.weekStart, weeklyPlan.weekEnd)}
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {daysLeft === 0
                        ? 'Starts today — get ready!'
                        : daysLeft === 1
                          ? 'Starts tomorrow'
                          : `Starts in ${daysLeft} days`}
                    </p>
                  </div>

                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft sm:h-[4.5rem] sm:w-[4.5rem]">
                    <p className="text-2xl font-bold tabular-nums leading-none text-primary sm:text-3xl">{daysLeft}</p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {daysLeft === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  <HeroStat label="Activities" value={weeklyPlan.activities.length} accent="foreground" />
                  <HeroStat label="Daily goals" value={dailyActivities.length} accent="success" />
                  <HeroStat label="Weekly goals" value={weeklyActivities.length} accent="primary" />
                  <HeroStat label="Max points" value={maxPoints.toFixed(0)} accent="success" />
                </div>

                {unlockedSets > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-primary" />
                    {unlockedSets} activity set{unlockedSets === 1 ? '' : 's'} unlocked for this plan
                  </p>
                )}
              </div>
            </section>

            <section className="section-card overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-border/70 bg-gradient-to-br from-primary-soft/40 via-surface to-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/10">
                    <ListChecks className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                      Planned activities
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                      {weeklyPlan.activities.length} goal
                      {weeklyPlan.activities.length === 1 ? '' : 's'} locked in
                    </p>
                  </div>
                </div>

                <div
                  role="tablist"
                  aria-label="Filter activities"
                  className="flex w-full gap-2 sm:w-auto sm:shrink-0"
                >
                  {(
                    [
                      { id: 'all', label: 'All', count: weeklyPlan.activities.length },
                      { id: 'daily', label: 'Daily', count: dailyActivities.length },
                      { id: 'weekly', label: 'Weekly', count: weeklyActivities.length },
                    ] as const
                  ).map((tab) => {
                    const isActive = activityFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActivityFilter(tab.id)}
                        className={cn(
                          'min-h-10 flex-1 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-4',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'border border-border bg-surface text-muted-foreground hover:border-primary/25 hover:bg-accent/50 hover:text-foreground'
                        )}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 p-4 sm:p-5">
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity) => (
                    <ActivityPlanCard
                      key={`${activity.activity}-${activity.cadence}`}
                      activity={activity}
                      activities={activities}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No {activityFilter} activities in this plan.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="section-card overflow-hidden">
              <div className="bg-gradient-to-br from-primary-soft/70 via-surface to-surface p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                      <Sparkles className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                        Ready when the week starts
                      </h3>
                      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                        Your plan activates automatically on{' '}
                        <span className="font-semibold text-foreground">
                          {DateTime.fromISO(weeklyPlan.weekStart).toFormat('EEEE, MMM d')}
                        </span>
                        . Until then, keep logging this week&apos;s tasks.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                          <CalendarDays className="h-3 w-3 text-primary" />
                          Auto-activates
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                          <Lock className="h-3 w-3 text-primary" />
                          Editable until start
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[12.5rem] sm:shrink-0">
                    <Button
                      className="w-full gap-2"
                      onClick={() => router.push('/tasks')}
                    >
                      Go to today&apos;s tasks
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => router.push(`/create-plan?edit=${weeklyPlan._id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit plan
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {!error && !weeklyPlan && (
          <div className="section-card gradient-orange flex flex-col items-center px-6 py-12 text-center sm:py-14">
            <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
              <CalendarDays className="h-8 w-8" />
            </span>
            <h2 className="text-xl font-bold text-foreground">No upcoming plan yet</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Create your next week&apos;s plan anytime. Once saved, it will appear here so you
              can preview your goals before they go live.
            </p>
            <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
              <Button className="gap-2" onClick={() => router.push('/create-plan')}>
                <TrendingUp className="h-4 w-4" />
                Create weekly plan
              </Button>
              <Button variant="outline" onClick={() => router.push('/home')}>
                Back to home
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
