'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, getCookie, setCookie } from '@/lib/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame, Activity, ChevronDown, Calendar, TrendingUp, Loader2, BarChart3, ListChecks, CalendarDays, LayoutGrid, MapPin } from 'lucide-react';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { AppQuickLinks } from '@/components/nav/AppQuickLinks';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { Button } from '@/components/ui/button';
import WelcomeBanner from '@/components/ui/WelcomeBanner';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import { useLogoutConfirm } from '@/lib/hooks/useLogoutConfirm';
import { DashboardHeader } from '@/components/ui/DashboardHeader';
import { StatCard } from '@/components/ui/PageHeader';
import { DateTime } from 'luxon';
import GuidedTour from '@/components/ui/GuidedTour';
import TourStartButton from '@/components/ui/TourStartButton';
import { homeTourSteps } from '@/lib/utils/tourSteps';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ActivityChart from '@/components/charts/ActivityChart';
import { WeekTips, buildWeekTips } from '@/components/ui/WeekTips';
import CompactDatePicker from '@/components/ui/CompactDatePicker';
import { useHomePageData } from '@/lib/queries/useHomePageData';
import { resolveActivityIcon } from '@/lib/utils/activityIcon';
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
  const { user, accessToken, isHydrated, selectedProfile, setUser } = useAuthStore();
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [expandedSections, setExpandedSections] = useState({
    weeklyPerformance: true,
    activityGoals: false,
    pendingActivities: false,
    leaderboard: false,
    logTracker: false,
    recommendations: false,
    explore: false,
  });
  const [logDateFilter, setLogDateFilter] = useState<string>(DateTime.local().toFormat('yyyy-MM-dd'));
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showTourButton, setShowTourButton] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const isProfilePaused = Boolean(selectedProfile?.pause ?? selectedProfile?.setting?.pause);

  const dataEnabled = isHydrated && !!accessToken && !!user && !!selectedProfile?._id;

  const {
    isBootstrapping,
    isRefreshing,
    weeklyPlan,
    upcomingPlan,
    noPlanError,
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
    prefetchDailySummary,
    prefetchCalendar,
    invalidateDashboard,
  } = useHomePageData({
    profileId: selectedProfile?._id,
    logDateFilter,
    enabled: dataEnabled,
  });

  useEffect(() => {
    setIsMounted(true);

    // Check if there's a date query parameter from calendar navigation after mount
    const dateParam = searchParams.get('date');
    if (dateParam && isHydrated) {
      setLogDateFilter(dateParam);
      setExpandedSections(prev => ({ ...prev, logTracker: true }));

      // Scroll to log tracker after a short delay
      setTimeout(() => {
        const logTrackerElement = document.querySelector('.log-tracker');
        if (logTrackerElement) {
          logTrackerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [searchParams, isHydrated]);

  const { requestLogout, LogoutConfirmDialog } = useLogoutConfirm();

  const handleStartTour = () => {
    setRunTour(true);
    setShowTourButton(false);
  };

  const handleTourFinish = () => {
    setRunTour(false);
    setShowTourButton(true);
    setCookie('hasSeenWelcomeBanner', 'true', 30);
    localStorage.setItem('tourCompleted', 'true');
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

  const handleWeekBarClick = (weekStartISO: string) => {
    prefetchDailySummary(weekStartISO);
    setLogDateFilter(weekStartISO);
    setExpandedSections(prev => ({ ...prev, logTracker: true }));
    setTimeout(() => {
      document.querySelector('.log-tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || !user) {
      router.push('/login');
    }
  }, [accessToken, user, router, isHydrated]);

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
    if (isUserCreatedToday && (getCookie('hasSeenWelcomeBanner') == null || getCookie('hasSeenWelcomeBanner') === 'false')) {
      setRunTour(true);
      setShowTourButton(false);
    }
  }, [isBootstrapping, selectedProfile]);

  const selectLogDate = (date: string) => {
    prefetchDailySummary(date);
    const dt = DateTime.fromISO(date);
    if (dt.isValid) prefetchCalendar(dt.month, dt.year);
    setLogDateFilter(date);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCloseWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    setCookie('hasSeenWelcomeBanner', 'true', 30);
  };

  const stats = {
    points: summary?.totalPoints || 0,
  };
  const weekDaysLogged = summary?.totalDaysLogged ?? 0;
  const totalDaysLogged = streakData?.overallStreak.totalDaysLogged ?? 0;
  const weekScoreHint = `${weekDaysLogged} of 7 days`;

  // Get current week's days (Monday to Sunday)
  const getCurrentWeekDays = () => {
    const now = DateTime.local();
    const startOfWeek = now.startOf('week'); // Monday
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = startOfWeek.plus({ days: i });
      const dateString = day.toFormat('yyyy-MM-dd');
      const calendarDay = weekCalendarDays.find((d) => d.date.split('T')[0] === dateString);
      
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
  const todayLogged = weekDays.find((d) => d.isToday)?.hasLog ?? false;
  const daysLoggedThisWeek = weekDays.filter((d) => d.hasLog).length;
  const daysLoggedHint = `${daysLoggedThisWeek} this week`;
  const pendingDailyCount =
    weeklyPlan?.activities.filter((a) => a.cadence === 'daily' && !a.TodayLogged).length ?? 0;
  const weekTips = buildWeekTips({
    streak: streakData?.overallStreak.currentStreak ?? 0,
    todayLogged,
    daysLoggedThisWeek,
    weekPoints: stats.points,
    pendingDailyCount,
    hasPlan: Boolean(weeklyPlan) && !noPlanError,
  });
  const trackerCalendarDays = weeklyLogData?.calendarDays || [];
  const trackerFirstDayOffset = trackerCalendarDays.length > 0
    ? new Date(trackerCalendarDays[0].date).getDay()
    : 0;
  const todayDate = DateTime.local().toFormat('yyyy-MM-dd');
  const dayChartPoints = useMemo(
    () => monthlyData.filter((p) => p.date.split('T')[0] <= todayDate),
    [monthlyData, todayDate]
  );
  const selectedDayChartIndex = useMemo(() => {
    const match = dayChartPoints.findIndex((p) => p.date.split('T')[0] === logDateFilter);
    if (match >= 0) return match;
    return dayChartPoints.findIndex((p) => p.date.split('T')[0] === todayDate);
  }, [dayChartPoints, logDateFilter, todayDate]);
  const selectedDateCalendarDay = trackerCalendarDays.find((d) => d.date.split('T')[0] === logDateFilter);
  const selectedDateHasLog = selectedDateCalendarDay?.hasLog || false;
  const selectedDateIsToday = logDateFilter === todayDate;
  const selectedDayStreak =
    typeof selectedDayLog?.streak === 'number'
      ? selectedDayLog.streak
      : (selectedDateIsToday ? (streakData?.overallStreak.currentStreak || 0) : 0);

  // Show loading only on first visit with no cached data
  if (!isHydrated || isBootstrapping) {
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

      {isMounted && showTourButton && !showWelcomeBanner && (
        <TourStartButton onClick={handleStartTour} />
      )}

      {/* Welcome Banner for New Users */}
      {showWelcomeBanner && (
        <WelcomeBanner
          userName={user?.name || 'there'}
          onClose={handleCloseWelcomeBanner}
        />
      )}

      <div className="w-full space-y-5">
        <DashboardHeader
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          isPaused={isProfilePaused}
          onLogout={requestLogout}
        />

        <Card className="section-card overflow-hidden border-primary/20 bg-gradient-to-br from-primary-soft/80 to-surface">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">GPS Fitness Tracker</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Record runs, walks, and rides with live maps and workout stats.
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button asChild size="sm" className="flex-1 sm:flex-none">
                <Link href="/tracker/live">Start workout</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Link href="/tracker">Open tracker</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {isRefreshing && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Updating dashboard…
          </div>
        )}

        {noPlanError && (
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
        )}

        {/* Weekly Tracker */}
        <Card className="week-tracker section-card app-card-hover overflow-visible">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
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
                {weeklyPlan?._id &&
                  (weeklyPlan.status === 'active' || weeklyPlan.status === 'carried-forward') && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px]"
                    >
                      <Link href={`/create-plan?edit=${weeklyPlan._id}`}>Edit plan</Link>
                    </Button>
                  )}
                <span className="chip chip-active shrink-0 text-[10px]">
                  <Flame className="h-3 w-3" />
                  {streakData?.overallStreak.currentStreak || 0}d streak
                </span>
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
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-md'
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
            <div className="mt-3 border-t border-border pt-3">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuenow={daysLoggedThisWeek}
                aria-valuemin={0}
                aria-valuemax={7}
                aria-label={`${daysLoggedThisWeek} of 7 days logged this week`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                  style={{ width: `${(daysLoggedThisWeek / 7) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="stats-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          <div onClick={() => router.push('/streak-calendar')} className="h-full cursor-pointer">
            <StatCard
              label="Current streak"
              value={`${streakData?.overallStreak.currentStreak || 0} days`}
              hint={`Best: ${streakData?.overallStreak.longestStreak || 0} days`}
              icon={Flame}
              accent="orange"
            />
          </div>
          <div onClick={() => router.push('/streak-calendar')} className="h-full cursor-pointer">
            <StatCard
              label="Days logged"
              value={totalDaysLogged}
              hint={daysLoggedHint}
              icon={CalendarDays}
              accent="neutral"
            />
          </div>
          <div className="h-full">
          <StatCard
            label={isShowingPreviousWeek ? 'Previous week score' : 'Week score'}
            value={stats.points.toFixed(2)}
            hint={weekScoreHint}
            icon={Trophy}
            accent="green"
          />
          </div>
        </div>

        <CollapsibleSection
          title="Explore app"
          subtitle="Shortcuts to every main page"
          icon={LayoutGrid}
          expanded={expandedSections.explore}
          onToggle={() => toggleSection('explore')}
          contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
          <AppQuickLinks />
        </CollapsibleSection>

        <CollapsibleSection
          className="pending-activities"
          title="Pending activities"
          subtitle="Today's open tasks from your plan"
          icon={ListChecks}
          expanded={expandedSections.pendingActivities}
          onToggle={() => toggleSection('pendingActivities')}
        >
              
              {noPlanError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
                  <h3 className="font-semibold text-amber-900">No pending activities</h3>
                  <p className="mt-1 text-sm text-amber-800">Create a weekly plan to see pending activities.</p>
                </div>
              ) : weeklyPlan ? (
                <>
                  {/* Check if there are any pending activities */}
                  {(weeklyPlan.activities.filter(activity => activity.cadence === 'daily').length > 0 ||
                    weeklyPlan.activities.filter(activity => activity.cadence === 'weekly' && activity.targetValue - (activity.achievedUnits || 0) > 0).length > 0) ? (
                    <>
                      {/* Daily Activities Section */}
                      {weeklyPlan.activities.filter(activity => activity.cadence === 'daily').length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center">
                              <span className="text-primary text-sm font-semibold">📅</span>
                            </div>
                            <h2 className="text-base font-semibold text-gray-900">Daily Activities</h2>
                          </div>
                          {weeklyPlan.activities
                            .filter(activity => activity.cadence === 'daily')
                            .map((activity, index) => {
                              const activityData = typeof activity === 'object' ? activity : null;
                              const weekEnd = new Date(weeklyPlan.weekEnd);
                              const today = new Date();
                              const remainingDays = Math.max(0, Math.ceil((weekEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                              const remaining = activity.targetValue * remainingDays - ((activity.TodayLogged) ? (activity.targetValue) : (0));
                              const isSurprise = activity?.isSurpriseActivity || false;
                              const isCompleted = activity.TodayLogged && (activity.achieved || 0) > 0;
                              const isPartial = activity.TodayLogged && (activity.achieved || 0) > 0 && (activity.achieved || 0) < (activity.dailyTarget || 0);

                              return (
                                <div key={index} className={`
                                  ${isSurprise
                                    ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 border-l-4 border-amber-400'
                                    : isCompleted
                                      ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-l-4 border-emerald-500'
                                      : activity.TodayLogged
                                        ? 'bg-gradient-to-br from-rose-50 to-red-50 border-l-4 border-rose-400'
                                        : 'bg-gradient-to-br from-slate-50 to-gray-50 border-l-4 border-slate-300'
                                  } rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 relative group`}>
                                  {isSurprise && (
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                                      <span>🎁</span>
                                      <span className="tracking-wide">BONUS</span>
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSurprise
                                        ? 'bg-amber-100'
                                        : isCompleted
                                          ? 'bg-emerald-100'
                                          : activity.TodayLogged
                                            ? 'bg-rose-100'
                                            : 'bg-slate-200'
                                        }`}>
                                        <span className="text-xl">
                                          {isSurprise ? (activity.TodayLogged ? '🎉' : '🎁') : (activity.TodayLogged ? (activity.achieved || 0) > 0 ? '✓' : '✗' : '○')}
                                        </span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm mb-0.5 ${isSurprise ? 'text-amber-900' : 'text-gray-900'}`}>
                                          {activityData?.label || 'Activity'}
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/60 text-gray-600 border border-gray-200">
                                            Daily
                                          </span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600 font-medium">{activityData?.unit}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-left sm:text-right sm:ml-3">
                                      {activity.TodayLogged ? (
                                        <div>
                                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${(activity.achieved || 0) > 0
                                            ? isSurprise
                                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                                            }`}>
                                            {(activity.achieved || 0) > 0
                                              ? (activity.achieved || 0) >= (activity.dailyTarget || 0)
                                                ? 'Completed'
                                                : 'Partial'
                                              : 'Incomplete'
                                            }
                                          </span>
                                          {isPartial && (
                                            <p className="text-xs text-gray-500 mt-1">
                                              {activity.achieved}/{activity.dailyTarget}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <div>
                                          <p className={`text-sm font-bold ${isSurprise ? 'text-amber-700' : 'text-slate-700'}`}>
                                            {activity.targetValue}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-0.5">{activityData?.unit}/day</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Weekly Activities Section */}
                      {weeklyPlan.activities.filter(activity => activity.cadence === 'weekly' && activity.targetValue - (activity.achievedUnits || 0) > 0).length > 0 && (
                        <div className="space-y-3 mt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                              <span className="text-orange-600 text-sm font-semibold">📊</span>
                            </div>
                            <h2 className="text-base font-semibold text-gray-900">Weekly Activities</h2>
                          </div>
                          {weeklyPlan.activities
                            .filter(activity => activity.cadence === 'weekly' && activity.targetValue - (activity.achievedUnits || 0) > 0)
                            .map((activity, index) => {
                              const activityData = typeof activity === 'object' ? activity : null;
                              const weekEnd = new Date(weeklyPlan.weekEnd);
                              const today = new Date();
                              const remainingDays = Math.max(0, Math.ceil((weekEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                              const remaining = activity.targetValue - (activity.achievedUnits || 0);
                              const isSurprise = activity?.isSurpriseActivity || false;
                              const progress = ((activity.achievedUnits || 0) / activity.targetValue) * 100;

                              return (
                                <div key={index} className={`${isSurprise
                                  ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 border-l-4 border-amber-400'
                                  : 'bg-gradient-to-br from-orange-50 to-amber-50 border-l-4 border-orange-400'
                                  } rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 relative`}>
                                  {isSurprise && (
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                                      <span>🎁</span>
                                      <span className="tracking-wide">BONUS</span>
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSurprise ? 'bg-amber-100' : 'bg-orange-100'
                                        }`}>
                                        <span className="text-xl">{isSurprise ? '🎁' : '○'}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm mb-0.5 ${isSurprise ? 'text-amber-900' : 'text-gray-900'}`}>
                                          {activityData?.label || 'Activity'}
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/60 text-gray-600 border border-gray-200">
                                            Weekly
                                          </span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600 font-medium">{activityData?.unit}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-left sm:text-right sm:ml-3">
                                      <p className={`text-sm font-bold ${isSurprise ? 'text-amber-700' : 'text-orange-700'}`}>
                                        {remaining}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">{activityData?.unit} left</p>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600 font-medium">Progress</span>
                                      <span className="text-gray-700 font-semibold">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/80 rounded-full overflow-hidden border border-gray-200/50">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${isSurprise
                                          ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                          : 'bg-gradient-to-r from-orange-400 to-amber-500'
                                          }`}
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                                      <span className="text-gray-500">
                                        {activity.achievedUnits || 0} / {activity.targetValue} {activityData?.unit}
                                      </span>
                                      <span className="text-gray-600 font-medium">
                                        {remainingDays} day{remainingDays !== 1 ? 's' : ''} left
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-l-4 border-emerald-500 rounded-r-lg p-6 text-center shadow-sm">
                      <div className="text-5xl mb-3">🎉</div>
                      <h3 className="font-bold text-emerald-900 text-base mb-2">All Caught Up!</h3>
                      <p className="text-sm text-emerald-700">You&apos;ve completed all your activities for this week.</p>
                    </div>
                  )}

                  {/* Completed Activities Section */}
                  {weeklyPlan.activities.filter(activity => {
                    return activity.cadence === 'weekly' && activity.targetValue - (activity.achievedUnits || 0) <= 0;
                  }).length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-600 text-sm font-semibold">✓</span>
                          </div>
                          <h2 className="text-base font-semibold text-gray-900">Completed Activities</h2>
                        </div>
                        <div className="space-y-3">
                          {weeklyPlan.activities
                            .filter(activity => {
                              return activity.cadence === 'weekly' && activity.targetValue - (activity.achievedUnits || 0) <= 0;
                            })
                            .map((activity, index) => {
                              const activityData = typeof activity === 'object' ? activity : null;

                              return (
                                <div key={index} className="bg-gradient-to-br from-emerald-50 to-green-50 border-l-4 border-emerald-500 rounded-lg p-4 shadow-sm">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <span className="text-xl text-emerald-600">✓</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-900 mb-0.5">
                                          {activityData?.label || 'Activity'}
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/60 text-gray-600 border border-gray-200">
                                            Weekly
                                          </span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600 font-medium">{activityData?.unit}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-left sm:text-right sm:ml-3">
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Completed
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="h-2 bg-emerald-100 rounded-full overflow-hidden border border-emerald-200/50">
                                      <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-300"
                                        style={{ width: '100%' }}
                                      ></div>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                                      <span className="text-emerald-700 font-semibold">
                                        {activity.achievedUnits || 0} / {activity.targetValue} {activityData?.unit}
                                      </span>
                                      <span className="text-emerald-600 font-medium">100%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          }
                        </div>
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

      <WeekTips tips={weekTips} />

      <div className="mt-2 space-y-4 sm:mt-4">
        <CollapsibleSection
          className="weekly-performance"
          title="Monthly performance"
          subtitle={viewMode === 'week' ? 'Points by week' : 'Points by day'}
          icon={BarChart3}
          expanded={expandedSections.weeklyPerformance}
          onToggle={() => toggleSection('weeklyPerformance')}
          contentClassName="space-y-4"
        >
          {monthlyLogData !== null ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <ChipTabs
                  tabs={[
                    { id: 'day', label: 'Day' },
                    { id: 'week', label: 'Week' },
                  ]}
                  active={viewMode}
                  onChange={(id) => setViewMode(id as 'day' | 'week')}
                />
              </div>

              {viewMode === 'week' ? (
                <ActivityChart
                  data={weeklyData.slice(0, -1).map((week) => ({
                    label: week.weekStart,
                    value: Number(week.totalPoints.toFixed(1)),
                  }))}
                  variant="bar"
                  height={240}
                  onBarClick={(_, index) => {
                    const week = weeklyData.slice(0, -1)[index];
                    if (week) router.push(`/week-analysis?weekStart=${week.weekStartISO}`);
                  }}
                />
              ) : (
                <ActivityChart
                  data={dayChartPoints.map((point) => ({
                    label: String(point.day),
                    tooltipLabel: DateTime.fromISO(point.date.split('T')[0]).toFormat('MMM d'),
                    value: Number(point.points.toFixed(1)),
                  }))}
                  variant="line"
                  height={260}
                  selectedIndex={selectedDayChartIndex}
                  onBarClick={(_, index) => {
                    const point = dayChartPoints[index];
                    if (point) handleBarClick(point.date);
                  }}
                />
              )}

              <div className="grid grid-cols-1 gap-2 border-t border-border pt-4 sm:grid-cols-3 sm:gap-3">
                {viewMode === 'week' ? (
                  <>
                    <div className="rounded-xl bg-secondary p-2 text-center sm:p-3">
                      <p className="text-base font-bold text-foreground sm:text-lg">
                        {weeklyData.length > 1 ? (weeklyData.slice(0, -1).reduce((sum, w) => sum + w.totalPoints, 0) / (weeklyData.length - 1)).toFixed(1) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Weekly avg</p>
                    </div>
                    <div className="rounded-xl bg-secondary p-3 text-center">
                      <p className="text-lg font-bold text-success">
                        {weeklyData.length > 1 ? Math.max(...weeklyData.slice(0, -1).map(w => w.totalPoints)).toFixed(1) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Best week</p>
                    </div>
                    <div className="rounded-xl bg-secondary p-3 text-center">
                      <p className="text-lg font-bold text-primary">{Math.max(0, weeklyData.length - 1)}</p>
                      <p className="text-xs text-muted-foreground">Weeks tracked</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-secondary p-2 text-center sm:p-3">
                      <p className="text-base font-bold text-foreground sm:text-lg">
                        {dayChartPoints.length > 0 ? (dayChartPoints.reduce((sum, d) => sum + d.points, 0) / dayChartPoints.length).toFixed(1) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Daily avg</p>
                    </div>
                    <div className="rounded-xl bg-secondary p-3 text-center">
                      <p className="text-lg font-bold text-success">
                        {dayChartPoints.length > 0 ? Math.max(...dayChartPoints.map(d => d.points)).toFixed(1) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Best day</p>
                    </div>
                    <div className="rounded-xl bg-secondary p-3 text-center">
                      <p className="text-lg font-bold text-primary">
                        {dayChartPoints.length > 0 ? Math.max(...dayChartPoints.map(d => d.activitiesCount)) : 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Max activities</p>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/50">
              <p className="text-sm text-muted-foreground">Log activities to see your chart</p>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          className="leaderboard-section"
          title="Leaderboard"
          subtitle="Compare progress with others"
          icon={Trophy}
          expanded={expandedSections.leaderboard}
          onToggle={() => toggleSection('leaderboard')}
          overflowVisible
          contentClassName="overflow-visible"
        >
          <Leaderboard />
        </CollapsibleSection>

        <CollapsibleSection
          id="log-tracker"
          className="log-tracker"
          title="Daily log tracker"
          subtitle="Pick a date to review or submit"
          icon={CalendarDays}
          expanded={expandedSections.logTracker}
          onToggle={() => toggleSection('logTracker')}
          contentClassName="space-y-4"
        >
          <div className="rounded-xl border border-border bg-secondary/40 p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {weeklyLogData?.monthName || DateTime.local().toFormat('LLLL')} {weeklyLogData?.year || DateTime.local().year}
              </h3>
              <div className="flex gap-3 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Logged
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Missing
                </span>
              </div>
            </div>

            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="py-1 text-center text-xs font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {Array.from({ length: trackerFirstDayOffset }).map((_, index) => (
                    <div key={`tracker-empty-${index}`} className="aspect-square" />
                  ))}

                  {trackerCalendarDays.map((day) => {
                    const dateOnly = day.date.split('T')[0];
                    const isSelected = logDateFilter === dateOnly;
                    const baseClasses = day.isFuture
                      ? 'cursor-not-allowed border-border bg-secondary text-muted-foreground'
                      : day.hasLog
                        ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100';

                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={day.isFuture}
                        onClick={() => !day.isFuture && selectLogDate(dateOnly)}
                        className={`relative aspect-square w-full rounded-lg border text-xs font-semibold transition-colors sm:text-sm ${baseClasses} ${
                          isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                        }`}
                        title={`${dateOnly} - ${day.hasLog ? 'Submitted' : 'Not Submitted'}`}
                      >
                        <span className="inline-flex h-full w-full items-center justify-center">
                          {day.day}
                        </span>
                        {!day.isFuture && (
                          <span
                            className={`absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ${day.hasLog ? 'bg-primary-foreground/90' : 'bg-rose-400'}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-medium text-muted-foreground">Date</span>
            <CompactDatePicker
              value={logDateFilter}
              onChange={selectLogDate}
              maxDate={DateTime.local().toFormat('yyyy-MM-dd')}
              calendarDays={trackerCalendarDays}
            />
          </div>

          {!selectedDateHasLog && (
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
              {isDailyLogFetching && !selectedDayLog ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Loading log for this date…
                </div>
              ) : selectedDayLog ? (
                <div className="space-y-4">
                  {/* Summary Header */}
                  <div className="bg-gradient-to-br bg-accent rounded-xl p-5 border border-border shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-md">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-base text-gray-900 mb-0.5">
                            {new Date(selectedDayLog.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-soft rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                              <span className="text-xs font-semibold text-foreground">
                                {selectedDayLog.activities.filter(activity => activity.achieved > 0).length} {selectedDayLog.activities.filter(activity => activity.achieved > 0).length === 1 ? 'Activity' : 'Activities'} Completed
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end mb-1">
                          <Trophy className="w-5 h-5 text-primary" />
                          <p className="text-3xl font-bold text-primary">
                            {selectedDayLog.totalPoints.toFixed(2)}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wide">Total Points</p>
                      </div>
                    </div>
                    {selectedDayStreak > 0 && (
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-border">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
                          <Flame className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {selectedDayStreak} Day Streak Active
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Activities List */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1 h-5 bg-gradient-to-b from-orange-500 to-indigo-600 rounded-full"></div>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Activity Details</h4>
                    </div>
                    {selectedDayLog.activities.map((activity, index) => (
                      <div
                        key={index}
                        className={`rounded-xl p-4 border-2 transition-all hover:shadow-md ${activity.achieved > 0
                          ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                          : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                          }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                                activity.achieved > 0 ? 'bg-success-soft' : 'bg-secondary'
                              }`}
                            >
                              {resolveActivityIcon(activityList, activity.activityId, activity.activity)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 mb-1">{activity.activity}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${activity.cadance === 'daily'
                                  ? 'bg-primary-soft text-accent-foreground border border-border'
                                  : 'bg-purple-100 text-purple-800 border border-orange-200'
                                  }`}>
                                  {activity.cadance === 'daily' ? 'Daily Goal' : 'Weekly Goal'}
                                </span>
                                <span className="text-xs font-medium text-gray-600">
                                  {activity.cadance === 'daily'
                                    ? `${activity.achieved} / ${activity.target} ${activity.unit}`
                                    : activity.unit === 'days'
                                      ? (activity.achieved ? `Completed` : `Not Completed`)
                                      : `${activity.achieved} ${activity.unit}`
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 justify-end mb-1">
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                              <p className="text-base font-bold text-emerald-600">
                                +{activity.pointsEarned.toFixed(2)}
                              </p>
                            </div>
                            <p className={`text-xs font-semibold uppercase tracking-wide ${activity.achieved <= 0
                              ? 'text-gray-500'
                              : activity.pointsEarned === 0
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                              }`}>
                              {activity.achieved <= 0
                                ? "Not Done"
                                : activity.pointsEarned === 0
                                  ? "Target Met"
                                  : "Points Earned"
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-slate-100 flex items-center justify-center border-2 border-gray-200">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">No Activities Logged</p>
                  <p className="text-xs text-gray-500">Select a different date to view your activity logs</p>
                </div>
              )}
        </CollapsibleSection>
      </div>
    </div>
    {LogoutConfirmDialog}
    </MainLayout>
  );
}
