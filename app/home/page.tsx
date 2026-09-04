'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame, Calendar, Loader2, BarChart3, ListChecks, CalendarDays, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { economyAPI, type EconomySummary } from '@/lib/api/economy';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Button } from '@/components/ui/button';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import { DashboardHeader } from '@/components/ui/DashboardHeader';
import { HeaderIconLink } from '@/components/ui/HeaderIconAction';
import { FeedMessagesPanel } from '@/components/feed/FeedMessagesPanel';
import { DateTime } from 'luxon';
import GuidedTour from '@/components/ui/GuidedTour';
import CreatePlanFab from '@/components/ui/CreatePlanFab';
import { homeTourSteps } from '@/lib/utils/tourSteps';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ActivityChart from '@/components/charts/ActivityChart';
import { useHomePageData } from '@/lib/queries/useHomePageData';
import { HomeCategoryCards } from '@/components/home/HomeCategoryCards';
import { HomeEconomyCards } from '@/components/home/HomeEconomyCards';
import { MissedDaysCard } from '@/components/home/MissedDaysCard';
import { ActivityCategoryCollapse } from '@/components/home/ActivityCategoryCollapse';
import { resolveActivityId } from '@/lib/utils/activityId';
import { DailyMotivationQuote } from '@/components/home/DailyMotivationQuote';
import { HomeMotivationCard } from '@/components/home/HomeMotivationCard';
import { HomeMoodCard } from '@/components/mood/HomeMoodCard';
import { WeekendPlanPromptModal } from '@/components/plan/WeekendPlanPromptModal';
import { CommunityInvitePromptCard } from '@/components/community/CommunityInvitePromptCard';
import { weeklyPlanAPI, type PlanChoiceState, type WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { resolveActivityIcon } from '@/lib/utils/activityIcon';
import { calendarDayMatches, toLocalDateKey } from '@/lib/utils/calendarDate';
import {
  nowInProfileZone,
  resolveProfileTimezone,
  todayInProfileZone,
} from '@/lib/utils/profileTime';
import {
  formatDailySummaryActivityProgress,
  formatPlanActivityProgress,
  progressBadgeClass,
  progressToneClass,
} from '@/lib/utils/activityProgress';
import {
  ACTIVITY_CATEGORIES,
  buildActivityCategoryMap,
  categoryLabel,
  filterPlanActivitiesByCategory,
  type ActivityCategory,
} from '@/lib/utils/activityCategory';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <LoadingScreen fullScreen label="Loading your dashboard…" />
      </MainLayout>
    }>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, isHydrated, sessionReady, selectedProfile, setUser } = useAuthStore();
  const profileZone = resolveProfileTimezone(selectedProfile?.timezone);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [economy, setEconomy] = useState<EconomySummary | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    weeklyPerformance: true,
    activityGoals: false,
    pendingActivities: false,
    leaderboard: false,
    logTracker: true,
  });
  // Empty until mount — avoids Vercel SSR (UTC) baking the wrong calendar day into state.
  const [logDateFilter, setLogDateFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [weekendPrompt, setWeekendPrompt] = useState<PlanChoiceState['weekendPrompt'] | null>(
    null
  );
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const isProfilePaused = Boolean(selectedProfile?.pause ?? selectedProfile?.setting?.pause);

  const dataEnabled =
    isHydrated &&
    sessionReady &&
    !!accessToken &&
    !!user &&
    !!selectedProfile?._id &&
    !!logDateFilter;

  useEffect(() => {
    if (!dataEnabled) return;
    let cancelled = false;
    void weeklyPlanAPI
      .getCurrentPlanState()
      .then(({ planChoice }) => {
        if (!cancelled) setWeekendPrompt(planChoice?.weekendPrompt ?? null);
      })
      .catch(() => {
        if (!cancelled) setWeekendPrompt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dataEnabled, selectedProfile?._id]);

  const {
    isBootstrapping,
    isRefreshing,
    weeklyPlan,
    upcomingPlan,
    noPlanError,
    hasCommunityActivities,
    communityActivityCount,
    hasPersonalPlan,
    summary,
    isShowingPreviousWeek,
    dailySummary,
    monthlyData,
    weeklyData,
    monthlyLogData,
    streakData,
    weeklyLogData,
    weekCalendarDays,
    selectedDayLog,
    isDailyLogFetching,
    userData,
    activityList,
    missedLogDays,
    prefetchDailySummary,
    prefetchCalendar,
    invalidateDashboard,
  } = useHomePageData({
    profileId: selectedProfile?._id,
    timezone: profileZone,
    logDateFilter,
    enabled: dataEnabled,
  });

  useEffect(() => {
    setIsMounted(true);

    // Check if there's a date query parameter from calendar navigation after mount
    const dateParam = searchParams.get('date');
    const todayKey = todayInProfileZone(profileZone);
    if (dateParam && isHydrated) {
      setLogDateFilter(dateParam);
      setExpandedSections((prev) => ({ ...prev, logTracker: true }));

      // Scroll to log tracker after a short delay
      setTimeout(() => {
        const logTrackerElement = document.querySelector('.log-tracker');
        if (logTrackerElement) {
          logTrackerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } else if (!logDateFilter) {
      setLogDateFilter(todayKey);
    }
  }, [searchParams, isHydrated, profileZone, logDateFilter]);

  useEffect(() => {
    if (!dataEnabled) return;
    let cancelled = false;
    void economyAPI
      .summary()
      .then((res) => {
        if (!cancelled) setEconomy(res.data.data);
      })
      .catch(() => {
        if (!cancelled) setEconomy(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dataEnabled, selectedProfile?._id]);

  const handleStartTour = () => {
    setExpandedSections({
      weeklyPerformance: true,
      activityGoals: true,
      pendingActivities: true,
      leaderboard: true,
      logTracker: true,
    });
    window.setTimeout(() => setRunTour(true), 160);
  };

  const handleTourFinish = () => {
    localStorage.setItem('tourCompleted', 'true');
    setRunTour(false);
  };

  const handleBarClick = (date: string) => {
    const isoDate = date.split('T')[0];
    prefetchDailySummary(isoDate);
    setLogDateFilter(isoDate);
    setExpandedSections(prev => ({ ...prev, logTracker: true }));
    setTimeout(() => {
      document.querySelector('.log-tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;
    if (!accessToken || !user) {
      router.push('/login');
    }
  }, [accessToken, user, router, isHydrated, sessionReady]);

  useEffect(() => {
    if (searchParams.get('refresh') !== '1' || !dataEnabled) return;
    void invalidateDashboard();
    router.replace('/home', { scroll: false });
  }, [searchParams, dataEnabled, invalidateDashboard, router]);

  useEffect(() => {
    if (userData) setUser(userData);
  }, [userData, setUser]);

  useEffect(() => {
    if (isBootstrapping || !selectedProfile) return;
    const isUserCreatedToday = selectedProfile.createdAt
      ? new Date(selectedProfile.createdAt).toDateString() === new Date().toDateString()
      : false;
    if (isUserCreatedToday && localStorage.getItem('tourCompleted') !== 'true') {
      handleStartTour();
    }
  }, [isBootstrapping, selectedProfile]);

  const profileCreatedAt = selectedProfile?.createdAt;
  const isFirstDayHomeTourDue =
    isMounted &&
    !!profileCreatedAt &&
    new Date(profileCreatedAt).toDateString() === new Date().toDateString() &&
    localStorage.getItem('tourCompleted') !== 'true';
  const blockOverlaysForTour = runTour || isFirstDayHomeTourDue;

  const selectLogDate = (date: string) => {
    prefetchDailySummary(date);
    const dt = DateTime.fromISO(date);
    if (dt.isValid) prefetchCalendar(dt.month, dt.year);
    setLogDateFilter(date);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const stats = {
    points: summary?.totalPoints || 0,
  };
  const totalDaysLogged = streakData?.overallStreak.totalDaysLogged ?? 0;
  const trackerCalendarDays = weeklyLogData?.calendarDays || [];

  // Get current week's days (Monday to Sunday) in the profile timezone
  const getCurrentWeekDays = () => {
    const now = nowInProfileZone(profileZone);
    const startOfWeek = now.startOf('week'); // Monday
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = startOfWeek.plus({ days: i });
      const dateString = day.toFormat('yyyy-MM-dd');
      const calendarDay =
        weekCalendarDays.find((d) => calendarDayMatches(d, dateString, profileZone)) ??
        trackerCalendarDays.find((d) => calendarDayMatches(d, dateString, profileZone));
      
      days.push({
        date: dateString,
        dayName: day.toFormat('EEE'), // Mon, Tue, etc.
        dayNumber: day.day,
        hasLog: calendarDay?.hasLog || false,
        isToday: day.toISODate() === now.toISODate(),
        isFuture: day > now,
      });
    }
    
    return days;
  };

  const weekDays = getCurrentWeekDays();
  const daysLoggedThisWeek = weekDays.filter((d) => d.hasLog).length;
  const daysLoggedHint = `${daysLoggedThisWeek} this week`;
  const isWeekend =
    nowInProfileZone(profileZone).weekday === 6 ||
    nowInProfileZone(profileZone).weekday === 7;
  const showWeekendDual = isWeekend && hasPersonalPlan && Boolean(weekendPrompt?.show);
  const trackerFirstDayOffset = trackerCalendarDays.length > 0
    ? DateTime.fromISO(toLocalDateKey(trackerCalendarDays[0].date, profileZone), {
        zone: profileZone,
      }).weekday % 7
    : 0;
  const todayDate = todayInProfileZone(profileZone);
  const calendarMonth = DateTime.fromISO(logDateFilter || todayDate, { zone: profileZone }).isValid
    ? DateTime.fromISO(logDateFilter || todayDate, { zone: profileZone }).startOf('month')
    : nowInProfileZone(profileZone).startOf('month');
  const canPrevLogMonth =
    calendarMonth > nowInProfileZone(profileZone).minus({ months: 24 }).startOf('month');
  const canNextLogMonth =
    calendarMonth.endOf('month') < nowInProfileZone(profileZone).endOf('month');
  const goToLogMonth = (delta: number) => {
    const target = calendarMonth.plus({ months: delta });
    const today = nowInProfileZone(profileZone);
    const nextDate = target.hasSame(today, 'month')
      ? today
      : delta < 0
        ? target.endOf('month')
        : target.startOf('month');
    selectLogDate(nextDate.toFormat('yyyy-MM-dd'));
  };
  const dayChartPoints = useMemo(
    () => monthlyData.filter((p) => p.date.split('T')[0] < todayDate),
    [monthlyData, todayDate]
  );
  const selectedDayChartIndex = useMemo(() => {
    return dayChartPoints.findIndex((p) => p.date.split('T')[0] === logDateFilter);
  }, [dayChartPoints, logDateFilter]);
  const completedWeeks = weeklyData.slice(0, -1);
  const weeklyAvgPoints = completedWeeks.length
    ? completedWeeks.reduce((sum, week) => sum + week.totalPoints, 0) / completedWeeks.length
    : 0;
  const bestWeekPoints = completedWeeks.length
    ? Math.max(...completedWeeks.map((week) => week.totalPoints))
    : 0;
  const dailyAvgPoints = dayChartPoints.length
    ? dayChartPoints.reduce((sum, day) => sum + day.points, 0) / dayChartPoints.length
    : 0;
  const bestDayPoints = dayChartPoints.length
    ? Math.max(...dayChartPoints.map((day) => day.points))
    : 0;
  const maxDayActivities = dayChartPoints.length
    ? Math.max(...dayChartPoints.map((day) => day.activitiesCount))
    : 0;
  const selectedDateCalendarDay = trackerCalendarDays.find((d) =>
    calendarDayMatches(d, logDateFilter, profileZone)
  );
  const selectedDateHasLog = selectedDateCalendarDay?.hasLog || false;
  const selectedDateIsToday = logDateFilter === todayDate;
  const selectedDayStreak =
    typeof selectedDayLog?.streak === 'number'
      ? selectedDayLog.streak
      : (selectedDateIsToday ? (streakData?.overallStreak.currentStreak || 0) : 0);

  const categoryById = useMemo(
    () => buildActivityCategoryMap(activityList),
    [activityList]
  );

  const filteredPlanActivities = useMemo(
    () =>
      filterPlanActivitiesByCategory(
        weeklyPlan?.activities ?? [],
        categoryById,
        selectedCategory
      ),
    [weeklyPlan?.activities, categoryById, selectedCategory]
  );

  const handleCategoryChange = (category: ActivityCategory | null) => {
    setSelectedCategory(category);
    if (category) {
      setExpandedSections((prev) => ({
        ...prev,
        pendingActivities: true,
        leaderboard: true,
      }));
    }
  };

  const selectedDayLogByCategory = useMemo(() => {
    if (!selectedDayLog?.activities?.length) return [];

    const categories = ACTIVITY_CATEGORIES;

    const groups = categories
      .map((category) => ({
        ...category,
        activities: selectedDayLog.activities.filter(
          (activity) => categoryById.get(activity.activityId) === category.id
        ),
      }))
      .filter((group) => group.activities.length > 0);

    if (!selectedCategory) return groups;
    return groups.filter((group) => group.id === selectedCategory);
  }, [selectedDayLog, categoryById, selectedCategory]);

  const pendingByCategory = useMemo(() => {
    return ACTIVITY_CATEGORIES.map((category) => {
      const items = filteredPlanActivities.filter(
        (activity) => categoryById.get(resolveActivityId(activity)) === category.id
      );
      const daily = items.filter((activity) => activity.cadence === 'daily');
      const weeklyOpen = items.filter(
        (activity) =>
          activity.cadence === 'weekly' &&
          activity.targetValue - (activity.achievedUnits || 0) > 0
      );
      const weeklyDone = items.filter(
        (activity) =>
          activity.cadence === 'weekly' &&
          activity.targetValue - (activity.achievedUnits || 0) <= 0
      );
      return { ...category, daily, weeklyOpen, weeklyDone };
    }).filter(
      (group) => group.daily.length > 0 || group.weeklyOpen.length > 0 || group.weeklyDone.length > 0
    );
  }, [filteredPlanActivities, categoryById]);

  const totalPendingCount = useMemo(() => {
    return pendingByCategory.reduce((sum, group) => {
      const dailyOpen = group.daily.filter(
        (activity) => formatPlanActivityProgress(activity).tone !== 'achieved'
      ).length;
      return sum + dailyOpen + group.weeklyOpen.length;
    }, 0);
  }, [pendingByCategory]);

  // Show loading only on first visit with no cached data
  if (!isHydrated || !sessionReady || !logDateFilter || isBootstrapping) {
    return (
      <MainLayout>
        <LoadingScreen fullScreen label="Loading your dashboard…" />
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      {/* Guided Tour - Only render on client */}
      {isMounted && <GuidedTour run={runTour} onFinish={handleTourFinish} steps={homeTourSteps} />}

      {isMounted ? (
        <CreatePlanFab
          hidden={blockOverlaysForTour}
          mode={hasPersonalPlan ? 'log' : 'create'}
          weekendDual={showWeekendDual}
          onTour={handleStartTour}
        />
      ) : null}

      {isMounted ? (
        <DailyMotivationQuote suppressed={blockOverlaysForTour || Boolean(weekendPrompt?.show)} />
      ) : null}

      <div className="w-full space-y-5">
        <DashboardHeader
          className="welcome-banner"
          isPaused={isProfilePaused}
          levelLabel={economy?.xp ? `Lv ${economy.xp.level}` : null}
          extraActions={
            <HeaderIconLink
              className="home-search"
              href="/feed/explore"
              icon={<Search className="h-[18px] w-[18px]" />}
              caption="Search"
            />
          }
          onOpenMessages={() => {
            setOpenConversationId(null);
            setMessagesOpen(true);
          }}
          onOpenMessageFromNotification={(conversationId) => {
            setOpenConversationId(conversationId);
            setMessagesOpen(true);
          }}
        />

        <HomeMoodCard
          className="home-mood"
          profileId={selectedProfile?._id}
          suppressed={blockOverlaysForTour || Boolean(weekendPrompt?.show)}
        />

        <HomeCategoryCards
          weeklyPlan={weeklyPlan}
          activityList={activityList}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        {selectedCategory ? (
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full py-1 pr-1 text-left transition-colors hover:bg-primary-soft/70"
            aria-label={`Clear ${categoryLabel(selectedCategory)} filter`}
          >
            <span className="text-sm leading-none" aria-hidden>
              {ACTIVITY_CATEGORIES.find((row) => row.id === selectedCategory)?.emoji}
            </span>
            <span className="min-w-0 truncate text-xs">
              <span className="font-semibold text-foreground">
                {categoryLabel(selectedCategory)}
              </span>
              <span className="text-muted-foreground"> · activities & leaderboard</span>
            </span>
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <X className="h-3.5 w-3.5" />
            </span>
          </button>
        ) : null}

        {isRefreshing && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Updating dashboard…
          </div>
        )}

        {noPlanError ? (
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">
                    🗓️
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-amber-900">No Active Plan Yet</h2>
                    <p className="mt-1 text-sm text-amber-800">
                      You don&apos;t have a weekly plan right now. Create one to unlock tasks, track points, and stay on streak.
                    </p>
                    {upcomingPlan?.weekStart && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        Upcoming plan starts on {DateTime.fromISO(String(upcomingPlan.weekStart)).toFormat('dd LLL yyyy')}.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => router.push('/create-plan')}
                  className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
                >
                  Create Weekly Plan
                </button>
              </div>
            </CardContent>
          </Card>
        ) : hasCommunityActivities ? (
          <Card className="border border-primary/20 bg-gradient-to-br from-primary-soft/40 via-surface to-surface shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-xl">
                    👥
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Community Activities</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      You have {communityActivityCount} community{' '}
                      {communityActivityCount === 1 ? 'activity' : 'activities'} to log today.
                      These count toward your activity totals but not personal Wellth points.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="default"
                  className="shrink-0"
                  onClick={() => router.push('/tasks')}
                >
                  Log community activities
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}


        <CollapsibleSection
          className="pending-activities"
          title="Pending activities"
          subtitle={
            selectedCategory
              ? `${categoryLabel(selectedCategory)} · today's open activities`
              : "Today's open activities from your plan"
          }
          badge={totalPendingCount > 0 ? String(totalPendingCount) : undefined}
          icon={ListChecks}
          expanded={expandedSections.pendingActivities}
          onToggle={() => toggleSection('pendingActivities')}
        >
              
              {noPlanError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <h3 className="font-semibold text-amber-900">No pending activities</h3>
                  <p className="mt-1 text-sm text-amber-800">Create a weekly plan to see pending activities.</p>
                </div>
              ) : hasCommunityActivities && !weeklyPlan ? (
                <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-5 text-center">
                  <h3 className="font-semibold text-foreground">Community activities waiting</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {communityActivityCount} {communityActivityCount === 1 ? 'activity' : 'activities'} from your communities — log on Tasks.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push('/tasks')}
                  >
                    Go to Tasks
                  </Button>
                </div>
              ) : weeklyPlan ? (
                <>
                  {pendingByCategory.length > 0 ? (
                    <div>
                      {pendingByCategory.map((group, index) => (
                        <ActivityCategoryCollapse
                          key={group.id}
                          emoji={group.emoji}
                          label={group.label}
                          count={group.daily.length + group.weeklyOpen.length + group.weeklyDone.length}
                          defaultOpen={index === 0}
                        >
                          <div className="space-y-3 pb-2">
                            {group.daily.map((activity) => (
                              <DailyPendingCard
                                key={resolveActivityId(activity)}
                                activity={activity}
                              />
                            ))}
                            {group.weeklyOpen.map((activity) => (
                              <WeeklyPendingCard
                                key={resolveActivityId(activity)}
                                activity={activity}
                                weekEnd={weeklyPlan.weekEnd}
                              />
                            ))}
                            {group.weeklyDone.map((activity) => (
                              <CompletedWeeklyCard
                                key={resolveActivityId(activity)}
                                activity={activity}
                              />
                            ))}
                          </div>
                        </ActivityCategoryCollapse>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-r-lg border-l-4 border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 p-6 text-center shadow-sm">
                      <div className="mb-3 text-5xl">🎉</div>
                      <h3 className="mb-2 text-base font-bold text-emerald-900">All Caught Up!</h3>
                      <p className="text-sm text-emerald-700">
                        {selectedCategory
                          ? `No pending ${categoryLabel(selectedCategory).toLowerCase()} activities this week.`
                          : "You've completed all your activities for this week."}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-3"></div>
                  <p className="text-sm text-gray-500">Loading pending activities...</p>
                </div>
              )}
        </CollapsibleSection>

        <CollapsibleSection
          id="log-tracker"
          className="log-tracker"
          title={
            selectedProfile?.name
              ? `${selectedProfile.name}'s daily log`
              : 'Daily log'
          }
          subtitle={
            selectedCategory
              ? `${categoryLabel(selectedCategory)} · pick a date to review or submit`
              : 'Pick a date to review or submit'
          }
          icon={CalendarDays}
          expanded={expandedSections.logTracker}
          onToggle={() => toggleSection('logTracker')}
          contentClassName="space-y-4 pt-3"
        >
          <MissedDaysCard data={missedLogDays} />

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!canPrevLogMonth}
                onClick={() => goToLogMonth(-1)}
                className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="min-w-[8.5rem] text-center text-sm font-semibold text-foreground">
                {weeklyLogData?.monthName || nowInProfileZone(profileZone).toFormat('LLLL')}{' '}
                {weeklyLogData?.year || nowInProfileZone(profileZone).year}
              </h3>
              <button
                type="button"
                disabled={!canNextLogMonth}
                onClick={() => goToLogMonth(1)}
                className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: trackerFirstDayOffset }).map((_, index) => (
                <div key={`tracker-empty-${index}`} className="aspect-square" />
              ))}

              {trackerCalendarDays.map((day) => {
                const dateOnly = toLocalDateKey(day.date, profileZone);
                const isSelected = logDateFilter === dateOnly;
                const isToday = day.isToday || dateOnly === todayDate;
                const isMissed = !day.isFuture && !isToday && !day.hasLog;
                const numberClass = day.isFuture
                  ? 'cursor-not-allowed text-muted-foreground/40'
                  : day.hasLog
                    ? 'text-primary'
                    : isMissed
                      ? 'text-muted-foreground'
                      : 'text-foreground';

                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={day.isFuture}
                    onClick={() => !day.isFuture && selectLogDate(dateOnly)}
                    className={`flex aspect-square w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold sm:text-sm ${numberClass} ${
                      isSelected ? 'rounded-lg ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    title={`${dateOnly} - ${day.hasLog ? 'Submitted' : isMissed ? 'Missed' : 'Not submitted'}`}
                  >
                    <span>{day.day}</span>
                    {day.hasLog ? (
                      <span aria-hidden className="h-1 w-4 rounded-full bg-primary" />
                    ) : isMissed ? (
                      <X aria-hidden className="h-2.5 w-2.5 text-red-600" strokeWidth={3} />
                    ) : isToday ? (
                      <span aria-hidden className="h-1 w-4 rounded-full bg-foreground/50" />
                    ) : (
                      <span aria-hidden className="h-2.5 w-4" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-primary" />
                Logged
              </span>
              <span className="inline-flex items-center gap-1.5">
                <X className="h-2.5 w-2.5 text-red-600" strokeWidth={3} />
                Missed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-4 rounded-full bg-foreground/50" />
                Today
              </span>
            </div>
          </div>

          {!selectedDateHasLog && !noPlanError && (
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (selectedDateIsToday) router.push('/tasks');
                else router.push(`/previous-log?date=${logDateFilter}`);
              }}
            >
              {selectedDateIsToday ? 'Log today' : 'Log selected date'}
            </Button>
          )}
          {!selectedDateHasLog && noPlanError && selectedDateIsToday && (
            <Button
              type="button"
              className="w-full"
              onClick={() => router.push('/create-plan')}
            >
              Create a plan to start logging
            </Button>
          )}
              {isDailyLogFetching && !selectedDayLog ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Loading log for this date…
                </div>
              ) : selectedDayLog ? (
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-3 px-0.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {new Date(selectedDayLog.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {selectedDayLog.activities.filter((activity) => activity.achieved > 0).length}{' '}
                        completed
                        {selectedDayStreak > 0 ? ` · ${selectedDayStreak} day streak` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {selectedDayLog.totalPoints.toFixed(1)}%
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">Earned</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedDayLogByCategory.length === 0 && selectedCategory ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No {categoryLabel(selectedCategory).toLowerCase()} activities on this date
                      </p>
                    ) : null}
                    {selectedDayLogByCategory.map((group, index) => (
                      <ActivityCategoryCollapse
                        key={group.id}
                        emoji={group.emoji}
                        label={group.label}
                        count={group.activities.length}
                        defaultOpen={index === 0}
                      >
                        <ul>
                          {group.activities.map((activity) => {
                            const progress = formatDailySummaryActivityProgress(activity);
                            const earnedPercent = activity.pointsEarned.toFixed(1);

                            return (
                              <li
                                key={activity.activityId}
                                className="flex items-center gap-2 px-0.5 py-2"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-sm">
                                  {resolveActivityIcon(
                                    activityList,
                                    activity.activityId,
                                    activity.activity
                                  )}
                                </span>
                                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                                  {activity.activity}
                                </p>
                                <div className="shrink-0 text-right">
                                  <p className={`text-xs font-semibold ${progressToneClass(progress.tone)}`}>
                                    {progress.text}
                                  </p>
                                  {activity.status !== 'pending' && (
                                    <p className="text-[10px] font-bold tabular-nums text-primary">
                                      {earnedPercent}%
                                    </p>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </ActivityCategoryCollapse>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Select a date to view your log
                </p>
              )}
        </CollapsibleSection>

        <Card className="week-tracker section-card app-card-hover overflow-visible">
          <CardContent className="p-4 sm:p-5">
            <button
              type="button"
              onClick={() => router.push('/streak-calendar')}
              className="home-streak grid w-full grid-cols-2 gap-2 pb-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              aria-label="Open streak calendar and activity totals"
            >
              <span className="flex flex-col items-center gap-1 px-2 text-center">
                <Flame className="h-5 w-5 text-primary" strokeWidth={2.25} />
                <span className="text-2xl font-bold leading-none tabular-nums text-foreground sm:text-[1.75rem]">
                  {streakData?.overallStreak.currentStreak || 0}
                </span>
                <span className="text-xs font-semibold text-foreground">Streak</span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Best {streakData?.overallStreak.longestStreak || 0} days
                </span>
              </span>
              <span className="flex flex-col items-center gap-1 px-2 text-center">
                <CalendarDays className="h-5 w-5 text-primary" strokeWidth={2.25} />
                <span className="text-2xl font-bold leading-none tabular-nums text-foreground sm:text-[1.75rem]">
                  {totalDaysLogged}
                </span>
                <span className="text-xs font-semibold text-foreground">Days logged</span>
                <span className="text-[10px] font-medium text-muted-foreground">{daysLoggedHint}</span>
              </span>
            </button>

            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex shrink-0 rounded-lg bg-primary-soft p-1.5 text-primary">
                  <Calendar className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-foreground">This week</span>
                <span className="chip shrink-0 text-[10px] text-muted-foreground">
                  {daysLoggedThisWeek}/7 logged
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {upcomingPlan?._id && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-[11px]"
                  >
                    <Link href={`/create-plan?edit=${upcomingPlan._id}`}>Edit upcoming</Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => !day.isFuture && handleBarClick(day.date)}
                  className={`
                    flex flex-col items-center justify-center rounded-xl p-1 transition-colors sm:p-2
                    ${day.isToday ? 'bg-primary-soft ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''}
                    ${day.isFuture ? 'opacity-50' : 'cursor-pointer hover:bg-accent'}
                  `}
                >
                  <div className="mb-0.5 text-xs font-semibold tracking-wide text-gray-700 sm:mb-1">
                    {day.dayName}
                  </div>
                  <div
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-2xl transition-colors sm:h-11 sm:w-11 md:h-12 md:w-12
                      ${day.hasLog
                        ? 'bg-gradient-to-br from-primary to-primary-hover shadow-md'
                        : day.isFuture
                        ? 'border-2 border-gray-200 bg-gray-100'
                        : 'border-2 border-border bg-white hover:border-primary'
                      }
                    `}
                  >
                    {day.hasLog ? (
                      <Flame className="h-4 w-4 text-white animate-pulse sm:h-6 sm:w-6 md:h-7 md:w-7" />
                    ) : (
                      <Flame className="h-4 w-4 text-gray-300 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                    )}
                  </div>
                  <div className={`
                    mt-0.5 text-xs font-bold tracking-tight sm:mt-1
                    ${day.isToday ? 'text-primary' : 'text-gray-600'}
                  `}>
                    {day.dayNumber}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-end gap-3 border-t border-border pt-3">
              <div className="min-w-0 flex-1">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-secondary"
                  role="progressbar"
                  aria-valuenow={daysLoggedThisWeek}
                  aria-valuemin={0}
                  aria-valuemax={7}
                  aria-label={`${daysLoggedThisWeek} of 7 days logged this week`}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-500"
                    style={{ width: `${(daysLoggedThisWeek / 7) * 100}%` }}
                  />
                </div>
                {isShowingPreviousWeek ? (
                  <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                    No logs yet this week · showing last week
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold leading-none tabular-nums text-foreground">
                  {stats.points.toFixed(2)}%
                </p>
                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                  {isShowingPreviousWeek ? 'Last week' : 'Week score'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <HomeEconomyCards economy={economy} />

        <HomeMotivationCard />

        {weekendPrompt?.show && !blockOverlaysForTour ? (
          <WeekendPlanPromptModal
            weekendPrompt={weekendPrompt}
            onResolved={() => {
              void weeklyPlanAPI.getCurrentPlanState().then(({ planChoice }) => {
                setWeekendPrompt(planChoice?.weekendPrompt ?? null);
              });
            }}
          />
        ) : null}

        <CommunityInvitePromptCard />

        <div className="mt-2 space-y-4 sm:mt-4">
        <CollapsibleSection
          className="leaderboard-section"
          title="Weekly Consistency Leaderboard"
          subtitle={
            selectedCategory
              ? `${categoryLabel(selectedCategory)} category · compare weekly %`
              : 'Compare weekly % with others'
          }
          icon={Trophy}
          expanded={expandedSections.leaderboard}
          onToggle={() => toggleSection('leaderboard')}
          overflowVisible
          contentClassName="overflow-visible pt-3"
        >
          <Leaderboard
            categoryFilter={selectedCategory}
            onCategoryFilterClear={() => setSelectedCategory(null)}
          />
        </CollapsibleSection>

        <CollapsibleSection
          className="weekly-performance"
          title="Monthly performance"
          subtitle={viewMode === 'week' ? 'Weekly consistency scores · tap a bar for missed activities' : 'Daily scores (today excluded)'}
          icon={BarChart3}
          expanded={expandedSections.weeklyPerformance}
          onToggle={() => toggleSection('weeklyPerformance')}
          contentClassName="space-y-4 pt-3"
        >
          {monthlyLogData !== null ? (
            <>
              <div className="flex items-center justify-center gap-5">
                {(['week', 'day'] as const).map((mode) => {
                  const selected = viewMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className="flex flex-col items-center gap-1"
                    >
                      <span
                        className={
                          selected
                            ? 'text-sm font-semibold text-foreground'
                            : 'text-sm font-medium text-muted-foreground'
                        }
                      >
                        {mode === 'week' ? 'Week' : 'Day'}
                      </span>
                      <span
                        aria-hidden
                        className={`h-0.5 w-6 rounded-full ${selected ? 'bg-primary' : 'bg-transparent'}`}
                      />
                    </button>
                  );
                })}
              </div>

              {viewMode === 'week' ? (
                <ActivityChart
                  data={completedWeeks.map((week) => ({
                    label: week.weekStart,
                    value: Number(week.totalPoints.toFixed(2)),
                    displayValue: `${week.totalPoints.toFixed(2)}%`,
                  }))}
                  variant="bar"
                  height={220}
                  tooltipUnit="%"
                  showBarLabels
                  onBarClick={(_, index) => {
                    const week = completedWeeks[index];
                    if (week) router.push(`/week-analysis?weekStart=${week.weekStartISO}`);
                  }}
                />
              ) : (
                <ActivityChart
                  data={dayChartPoints.map((point) => ({
                    label: String(point.day),
                    tooltipLabel: DateTime.fromISO(point.date.split('T')[0]).toFormat('MMM d'),
                    value: Number(point.points.toFixed(2)),
                    displayValue: `${point.points.toFixed(2)}%`,
                  }))}
                  variant="line"
                  height={220}
                  tooltipUnit="%"
                  selectedIndex={selectedDayChartIndex}
                  onBarClick={(_, index) => {
                    const point = dayChartPoints[index];
                    if (point) handleBarClick(point.date);
                  }}
                />
              )}

              <div className="grid grid-cols-3 gap-2 pt-1">
                {viewMode === 'week' ? (
                  <>
                    <div className="text-center">
                      <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {weeklyAvgPoints.toFixed(2)}%
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Avg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {bestWeekPoints.toFixed(2)}%
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Best week</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {completedWeeks.length}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Weeks</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {dailyAvgPoints.toFixed(2)}%
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Avg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {bestDayPoints.toFixed(2)}%
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Best day</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                        {maxDayActivities}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Max acts</p>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Log activities to see your chart
            </p>
          )}
        </CollapsibleSection>
        </div>
      </div>

    <FeedMessagesPanel
      open={messagesOpen}
      onClose={() => {
        setMessagesOpen(false);
        setOpenConversationId(null);
      }}
      initialConversationId={openConversationId}
    />
    </MainLayout>
  );
}

function DailyPendingCard({ activity }: { activity: WeeklyPlanActivity }) {
  const isSurprise = activity.isSurpriseActivity || false;
  const progress = formatPlanActivityProgress(activity);
  const isAchieved = progress.tone === 'achieved';

  return (
    <div
      className={`relative rounded-lg p-4 shadow-sm transition-all duration-200 ${
        isSurprise
          ? 'border-l-4 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50'
          : isAchieved
            ? 'border-l-4 border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50'
            : activity.TodayLogged
              ? 'border-l-4 border-rose-400 bg-gradient-to-br from-rose-50 to-red-50'
              : 'border-l-4 border-slate-300 bg-gradient-to-br from-slate-50 to-gray-50'
      }`}
    >
      {isSurprise ? (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
          <span>🎁</span>
          <span className="tracking-wide">BONUS</span>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isSurprise
                ? 'bg-amber-100'
                : isAchieved
                  ? 'bg-emerald-100'
                  : activity.TodayLogged
                    ? 'bg-rose-100'
                    : 'bg-slate-200'
            }`}
          >
            <span className="text-xl">
              {isSurprise
                ? activity.TodayLogged
                  ? '🎉'
                  : '🎁'
                : isAchieved
                  ? '✓'
                  : activity.TodayLogged
                    ? '✗'
                    : '○'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className={`mb-0.5 text-sm font-semibold ${isSurprise ? 'text-amber-900' : 'text-gray-900'}`}>
              {activity.label || 'Activity'}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-gray-200 bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-600">
                Daily
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs font-medium text-gray-600">{activity.unit}</span>
            </div>
          </div>
        </div>
        <div className="text-left sm:ml-3 sm:text-right">
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${progressBadgeClass(progress.tone)}`}
          >
            {progress.text}
          </span>
        </div>
      </div>
    </div>
  );
}

function WeeklyPendingCard({
  activity,
  weekEnd,
}: {
  activity: WeeklyPlanActivity;
  weekEnd: string;
}) {
  const remainingDays = Math.max(
    0,
    Math.ceil((new Date(weekEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const isSurprise = activity.isSurpriseActivity || false;
  const progress = formatPlanActivityProgress(activity);
  const progressPercent =
    activity.targetValue > 0
      ? Math.min(100, ((activity.achievedUnits || 0) / activity.targetValue) * 100)
      : 0;

  return (
    <div
      className={`relative rounded-lg p-4 shadow-sm transition-all duration-200 ${
        isSurprise
          ? 'border-l-4 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50'
          : 'border-l-4 border-primary bg-gradient-to-br from-primary-soft to-surface'
      }`}
    >
      {isSurprise ? (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
          <span>🎁</span>
          <span className="tracking-wide">BONUS</span>
        </div>
      ) : null}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isSurprise ? 'bg-amber-100' : 'bg-primary-soft'
            }`}
          >
            <span className="text-xl">{isSurprise ? '🎁' : '○'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className={`mb-0.5 text-sm font-semibold ${isSurprise ? 'text-amber-900' : 'text-gray-900'}`}>
              {activity.label || 'Activity'}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-gray-200 bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-600">
                Weekly
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs font-medium text-gray-600">{activity.unit}</span>
            </div>
          </div>
        </div>
        <div className="text-left sm:ml-3 sm:text-right">
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${progressBadgeClass(progress.tone)}`}
          >
            {progress.text}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-600">Progress</span>
          <span className="font-semibold text-gray-700">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-gray-200/50 bg-white/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isSurprise
                ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                : 'bg-gradient-to-r from-primary to-primary-hover'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
          <span className="font-medium text-gray-600">
            {remainingDays} day{remainingDays !== 1 ? 's' : ''} left
          </span>
        </div>
      </div>
    </div>
  );
}

function CompletedWeeklyCard({ activity }: { activity: WeeklyPlanActivity }) {
  const progress = formatPlanActivityProgress(activity);

  return (
    <div className="rounded-lg border-l-4 border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <span className="text-xl text-emerald-600">✓</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-sm font-semibold text-gray-900">{activity.label || 'Activity'}</p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-gray-200 bg-white/60 px-2 py-0.5 text-xs font-medium text-gray-600">
                Weekly
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs font-medium text-gray-600">{activity.unit}</span>
            </div>
          </div>
        </div>
        <div className="text-left sm:ml-3 sm:text-right">
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${progressBadgeClass(progress.tone)}`}
          >
            {progress.text}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full border border-emerald-200/50 bg-emerald-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
            style={{ width: '100%' }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 text-xs">
          <span className="font-medium text-emerald-600">100%</span>
        </div>
      </div>
    </div>
  );
}
