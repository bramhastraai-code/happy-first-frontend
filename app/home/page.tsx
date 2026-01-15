'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, getCookie, setCookie } from '@/lib/store/authStore';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { dailyLogAPI, type DailySummary, type MonthlySummary, type StreakData } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import {  Trophy, Flame, Activity, ChevronDown, ChevronUp, LogOut, Smile, Calendar, Check, X, TrendingUp, Frown } from 'lucide-react';
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import type { WeeklySummary } from '@/lib/api/dailyLog';
import WelcomeBanner from '@/components/ui/WelcomeBanner';
import LeaderboardPage from '@/components/ui/leaderboard/page';
import { authAPI } from '@/lib/api/auth';
import { ProfileBadge } from '@/components/ui/ProfileBadge';
import { ProfileSwitcher } from '@/components/ui/ProfileSwitcher';
import { Settings } from 'lucide-react';
import { DateTime } from 'luxon';
import GuidedTour from '@/components/ui/GuidedTour';
import { HelpCircle } from 'lucide-react';



interface MonthlyDataPoint {
  date: string;
  points: number;
  day: number;
  activitiesCount: number;
}

interface WeeklyDataPoint {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  weekStartISO: string;
  totalPoints: number;
  avgActivities: number;
  daysCount: number;
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, isHydrated, logout, selectedProfile } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [monthlyLogData, setMonthlyLogData] = useState<number | null>(null);
  const [userData, setUser] = useState<typeof user | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  // Convert monthly data to weekly groups (Monday to Sunday)
  const groupDataByWeeks = (data: MonthlyDataPoint[]): WeeklyDataPoint[] => {
    const weeks: Map<string, MonthlyDataPoint[]> = new Map();

    data.forEach(point => {
      const date = DateTime.fromISO(point.date);
      // Get Monday of the week
      const weekStart = date.startOf('week');
      const weekKey = weekStart.toFormat('yyyy-MM-dd');

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, []);
      }
      weeks.get(weekKey)!.push(point);
    });

    return Array.from(weeks.entries()).map(([weekKey, points]) => {
      const weekStart = DateTime.fromISO(weekKey);
      const weekEnd = weekStart.endOf('week');

      return {
        weekLabel: `Week ${weekStart.toFormat('MMM dd')}`,
        weekStart: weekStart.toFormat('MMM dd'),
        weekEnd: weekEnd.toFormat('MMM dd'),
        weekStartISO: weekKey,
        totalPoints: points.reduce((sum, p) => sum + p.points, 0),
        avgActivities: points.reduce((sum, p) => sum + p.activitiesCount, 0) / points.length,
        daysCount: points.length
      };
    });
  };

  const [noPlanError, setNoPlanError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    weeklyPerformance: true,
    activityGoals: false,
    pendingActivities: true,
    leaderboard: false,
    logTracker: false,
    recommendations: false,
  });
  const [logDateFilter, setLogDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedDayLog, setSelectedDayLog] = useState<DailySummary | null>(null);
  const [upcomingPlan, setUpcomingPlan] = useState<WeeklyPlan | null>(null);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showTourButton, setShowTourButton] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
    setLogDateFilter(date);
    setExpandedSections(prev => ({ ...prev, logTracker: true }));
    // Scroll to log tracker section
    setTimeout(() => {
      const logTrackerElement = document.querySelector('.log-tracker');
      if (logTrackerElement) {
        logTrackerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleWeekBarClick = (weekStartISO: string) => {
    // Set the log date to the start of the selected week
    setLogDateFilter(weekStartISO);
    setExpandedSections(prev => ({ ...prev, logTracker: true }));
    // Scroll to log tracker section
    setTimeout(() => {
      const logTrackerElement = document.querySelector('.log-tracker');
      if (logTrackerElement) {
        logTrackerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated) return;

    if (!accessToken || !user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const today = new Date();
        console.log(today);
        const localDateString = DateTime.local().toFormat('yyyy-MM-dd');
        console.log(localDateString);

        const [planRes, summaryRes, dailyRes, monthlyRes, userInfo] = await Promise.all([
          weeklyPlanAPI.getCurrent(),
          dailyLogAPI.getSummary('weekly', localDateString),
          dailyLogAPI.getSummary('daily', localDateString).catch(() => null),
          dailyLogAPI.getSummary("monthly", localDateString),
          authAPI.userInfo(),

        ]);
        
        // Fetch streak data if selectedProfile is available
        if (selectedProfile?._id) {
          try {
            const streakRes = await dailyLogAPI.getStreaks(selectedProfile._id);
            setStreakData(streakRes.data.data);
          } catch (error) {
            console.error('Failed to fetch streak data:', error);
          }
        }
        
        const monthlyDataPoints = (monthlyRes.data.data as MonthlySummary).dailyBreakdown.map(item => ({
          date: item.date,
          points: item.points,
          activitiesCount: item.activityCount,
        }) as MonthlyDataPoint);
        setMonthlyData(monthlyDataPoints);
        setWeeklyData(groupDataByWeeks(monthlyDataPoints));
        setMonthlyLogData((monthlyRes.data.data as MonthlySummary).totalDaysLogged);
        setWeeklyPlan(planRes.data.data);
        setSummary(summaryRes.data.data as WeeklySummary);
        setUser(userInfo.data.data);
        if (dailyRes?.data?.data) {
          setDailySummary(dailyRes.data.data as DailySummary);
        }
        setNoPlanError('');
      } catch (error: unknown) {
        console.error('Failed to fetch data:', error);
        const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (errorMessage === 'No active weekly plan found') {
          setNoPlanError('No active weekly plan found. Create a weekly plan to track your activity goals.');

          // Check for upcoming plan for new users
          try {
            const upcomingRes = await weeklyPlanAPI.Upcomming();
            if (upcomingRes.data.data) {
              setUpcomingPlan(upcomingRes.data.data);
            }
          } catch (upcomingError) {
            console.log('No upcoming plan found:', upcomingError);
          }
        }
      }

      // Check if user was created today and show welcome banner
      const isUserCreatedToday = selectedProfile?.createdAt
        ? new Date(selectedProfile.createdAt).toDateString() == new Date().toDateString()
        : false;
      if (isUserCreatedToday && (getCookie('hasSeenWelcomeBanner') == null || getCookie('hasSeenWelcomeBanner') === 'false')) {
        // setShowWelcomeBanner(true); 
        setRunTour(true);
        setShowTourButton(false);
      }
    };
    fetchData();
  }, [accessToken, user, router, isHydrated, selectedProfile]);

  useEffect(() => {
    if (!accessToken || !logDateFilter) return;

    const fetchDayLog = async () => {
      try {
        const response = await dailyLogAPI.getSummary('daily', logDateFilter);
        setSelectedDayLog(response.data.data as DailySummary);
      } catch (error) {
        console.error('Failed to fetch daily log:', error);
        setSelectedDayLog(null);
      }
    };

    fetchDayLog();
  }, [logDateFilter, accessToken, selectedProfile]);

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

  return (
    <MainLayout >
      {/* Guided Tour - Only render on client */}
      {isMounted && <GuidedTour run={runTour} onFinish={handleTourFinish} />}

      {/* Tour Start Button - Only render on client */}
      {isMounted && showTourButton && (
        <button
          onClick={handleStartTour}
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all hover:scale-105"
          title="Start Tour"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="font-medium">Start Tour</span>
        </button>
      )}

      {/* Welcome Banner for New Users */}
      {showWelcomeBanner && (
        <WelcomeBanner
          userName={user?.name || 'there'}
          onClose={handleCloseWelcomeBanner}
        />
      )}

      <div className="p-4 space-y-4 ">
        {/* Header */}
        <div className="welcome-banner flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-gray-600">
                  Hello,
                </p>
                <ProfileBadge />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">{new Date().toDateString()}</span>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Live
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Hide ProfileSwitcher and Logout on mobile (< 520px) */}
            <div className="profile-switcher hidden min-[520px]:flex items-center gap-2">
              <ProfileSwitcher />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid grid grid-cols-2 gap-3">
          {/* Current Streak Card */}
          <Card 
            className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/streak-calendar')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-700">Streak</span>
                <Flame className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-1">
                {streakData?.overallStreak.currentStreak || 0} <Flame className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-700">
                  {streakData?.overallStreak.currentStreak === 1 ? 'day' : 'days'} in a row
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-orange-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-orange-600">Best: {streakData?.overallStreak.longestStreak || 0} days 🏆</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Week Score Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">Week Score</span>
                <Trophy className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-1">{stats.points.toFixed(2)}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700">{summary?.totalDaysLogged || 0} days logged</span>
              </div>
              <div className="mt-2 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min((summary?.totalPoints || 0), 100)}%` }}></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Activities */}
        <Card className="pending-activities border-0 shadow-sm">
          {expandedSections.pendingActivities && (
            <CardContent className="p-5 space-y-4">
              <h1 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Pending Activities</h1>
              {noPlanError ? (
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-5 text-center">
                  <div className="text-4xl mb-3">⏳</div>
                  <h3 className="font-semibold text-amber-900 text-base mb-2">No Pending Activities</h3>
                  <p className="text-sm text-amber-700">Create a weekly plan to see pending activities.</p>
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
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 text-sm font-semibold">📅</span>
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
                              const isSurprise = activity?.isSurpriseActivity|| false;
                              const isCompleted = activity.TodayLogged && (activity.achieved||0) > 0;
                              const isPartial = activity.TodayLogged && (activity.achieved||0) > 0 && (activity.achieved||0) < (activity.dailyTarget||0);

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
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        isSurprise 
                                          ? 'bg-amber-100' 
                                          : isCompleted 
                                            ? 'bg-emerald-100' 
                                            : activity.TodayLogged 
                                              ? 'bg-rose-100'
                                              : 'bg-slate-200'
                                      }`}>
                                        <span className="text-xl">
                                          {isSurprise ? (activity.TodayLogged ? '🎉' : '🎁') : (activity.TodayLogged ? (activity.achieved||0)>0 ? '✓' :'✗': '○')}
                                        </span>
                                      </div>
                                      <div className="flex-1">
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
                                    <div className="text-right ml-3">
                                      {activity.TodayLogged ? (
                                        <div>
                                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            (activity.achieved||0)>0
                                              ? isSurprise 
                                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                                          }`}>
                                            {(activity.achieved||0)>0
                                              ? (activity.achieved||0)>=(activity.dailyTarget||0) 
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
                                <div key={index} className={`${
                                  isSurprise 
                                    ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 border-l-4 border-amber-400'
                                    : 'bg-gradient-to-br from-orange-50 to-amber-50 border-l-4 border-orange-400'
                                } rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 relative`}>
                                  {isSurprise && (
                                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                                      <span>🎁</span>
                                      <span className="tracking-wide">BONUS</span>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        isSurprise ? 'bg-amber-100' : 'bg-orange-100'
                                      }`}>
                                        <span className="text-xl">{isSurprise ? '🎁' : '○'}</span>
                                      </div>
                                      <div className="flex-1">
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
                                    <div className="text-right ml-3">
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
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isSurprise 
                                            ? 'bg-gradient-to-r from-amber-400 to-orange-400' 
                                            : 'bg-gradient-to-r from-orange-400 to-amber-500'
                                        }`}
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs pt-1">
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
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <span className="text-xl text-emerald-600">✓</span>
                                      </div>
                                      <div className="flex-1">
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
                                    <div className="text-right ml-3">
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
                                    <div className="flex items-center justify-between text-xs pt-1">
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
            </CardContent>
          )}
        </Card>

        {/* AI Insights */}
        <Card className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-xs">✨</span>
              </div>
              <h3 className="font-semibold text-gray-900">AI Insights</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🎯</span>
                  <span className="text-xs font-medium text-blue-900">Rank Up Alert</span>
                  <span className="ml-auto text-xs font-semibold text-white bg-green-500 px-2 py-0.5 rounded-full">
                    92%
                  </span>
                </div>
                <p className="text-xs text-blue-800 mb-2">
                  Only 7 points away from #2. Focus on running +10km this week.
                </p>
                <p className="text-xs text-blue-600">→ Increase run frequency to 4x/week</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⚠️</span>
                  <span className="text-xs font-medium text-yellow-900">Streak Risk</span>
                </div>
                <p className="text-xs text-yellow-800 mb-2">
                  Sleep streak at risk. Miss streak reset.
                </p>
                <p className="text-xs text-yellow-600">→ Target 7+ hours tonight</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expandable Sections */}
        <div className="space-y-3">
          {/* Weekly Performance */}
          <Card className="weekly-performance">
            <button
              onClick={() => toggleSection('weeklyPerformance')}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-gray-900">Monthly Performance</span>
              {expandedSections.weeklyPerformance ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.weeklyPerformance && (monthlyLogData !== null ? (

              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{viewMode === 'week' ? 'Weekly Distribution' : 'Daily Performance'}</h3>
                    <p className="text-xs text-gray-600">{viewMode === 'week' ? 'Recent weeks (Mon-Sun)' : 'Last 30 days'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('day')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${viewMode === 'day'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        Day
                      </button>
                      <button
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${viewMode === 'week'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                          }`}
                      >
                        Week
                      </button>
                    </div>
                    
                  </div>
                </div>

                {/* Chart - Conditional Day/Week View */}
                {viewMode === 'week' ? (
                  /* Weekly View */
                  <div className="relative h-48 flex items-end gap-2 pb-10">
                    {weeklyData.slice(0, -1).map((week, index) => {
                      const filteredWeeklyData = weeklyData.slice(0, -1);
                      const maxPoints = Math.max(...filteredWeeklyData.map(w => w.totalPoints));
                      const heightPercentage = (week.totalPoints / maxPoints) * 100;

                      // Calculate activity trend line position
                      const maxActivities = Math.max(...filteredWeeklyData.map(w => w.avgActivities));
                      const activityHeightPercentage = (week.avgActivities / maxActivities) * 100;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end relative" style={{ height: '100%' }}>
                          {/* Activity avg circle - positioned independently */}
                          <div
                            className="absolute left-1/2 transform -translate-x-1/2 z-10"
                            style={{ bottom: `${activityHeightPercentage}%` }}
                          >
                            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
                          </div>

                          {/* Bar */}
                          <div className="w-full relative group flex items-end" style={{ height: '100%' }}>
                            <div
                              onClick={() => router.push(`/week-analysis?weekStart=${week.weekStartISO}`)}
                              className={`w-full rounded-t-lg transition-all duration-300 bg-gradient-to-t from-indigo-500 to-indigo-400 opacity-75 hover:opacity-100 cursor-pointer hover:shadow-xl`}
                              style={{ height: `${Math.max(heightPercentage, 8)}%` }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs py-2 px-3 rounded-lg whitespace-nowrap z-20 shadow-xl">
                                <div className="font-bold text-sm mb-1">{week.totalPoints.toFixed(1)} pts</div>
                                <div className="text-gray-300 text-xs">
                                  {week.weekStart} - {week.weekEnd}
                                </div>
                                <div className="text-gray-300 text-xs mt-1">
                                  Avg: {week.avgActivities.toFixed(1)} activities/day
                                </div>
                                <div className="text-gray-300 text-xs">
                                  {week.daysCount} days logs
                                </div>
                                <div className="text-xs text-blue-300 mt-1 border-t border-gray-700 pt-1">
                                  Click to see detailed analysis
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>

                          {/* Week labels */}
                          <div className="text-[10px] text-gray-600 absolute font-medium text-center" style={{ bottom: '-28px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
                            <div>{week.weekStart.split(' ')[0]}</div>
                            <div className="text-[9px] text-gray-500">{week.weekStart.split(' ')[1]}</div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Line connecting activity circles */}
                    <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: 'calc(100% - 40px)', width: '100%' }}>
                      {/* Line */}
                      <polyline
                        points={weeklyData.slice(0, -1).map((week, index) => {
                          const filteredWeeklyData = weeklyData.slice(0, -1);
                          const maxActivities = Math.max(...filteredWeeklyData.map(w => w.avgActivities));
                          const activityHeightPercentage = (week.avgActivities / maxActivities) * 100;
                          const totalBars = filteredWeeklyData.length;
                          const barWidth = 100 / totalBars;
                          const x = (index * barWidth) + (barWidth / 2);
                          const y = 100 - activityHeightPercentage;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                ) : (
                  /* Daily View */
                  <div className="relative h-48 flex items-end gap-0.5 pb-8">
                    {monthlyData.slice(0, -1).map((dataPoint, index) => {
                      const filteredMonthlyData = monthlyData.slice(0, -1);
                      const maxPoints = Math.max(...filteredMonthlyData.map(d => d.points));
                      const heightPercentage = (dataPoint.points / maxPoints) * 100;
                      const isWeekend = new Date(dataPoint.date).getDay() % 6 === 0;

                      // Calculate activity trend line position
                      const maxActivities = Math.max(...filteredMonthlyData.map(d => d.activitiesCount));
                      const activityHeightPercentage = (dataPoint.activitiesCount / maxActivities) * 100;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end relative" style={{ height: '100%' }}>
                          {/* Activity count circle - positioned independently */}
                          <div
                            className="absolute left-1/2 transform -translate-x-1/2 z-10"
                            style={{ bottom: `${activityHeightPercentage}%` }}
                          >
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                          </div>

                          {/* Bar */}
                          <div className="w-full relative group flex items-end" style={{ height: '100%' }}>
                            <div
                              onClick={() => handleBarClick(dataPoint.date)}
                              className={`w-full rounded-t-sm transition-all duration-300 ${isWeekend
                                  ? 'bg-indigo-400 opacity-80'
                                  : 'bg-indigo-400 opacity-70'
                                } hover:opacity-100 hover:scale-105 cursor-pointer`}
                              style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                            >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-20">
                                <div className="font-semibold">{dataPoint.points.toFixed(1)} pts</div>
                                <div className="text-gray-300">
                                  {dataPoint.activitiesCount} activities
                                </div>
                                <div className="text-gray-300">
                                  {new Date(dataPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>

                          {/* Day labels - show every 5th day */}
                          {index % 5 === 0 && (
                            <div className="text-[10px] text-gray-600 absolute font-medium" style={{ bottom: '-22px' }}>
                              {dataPoint.day}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Line connecting activity circles */}
                    <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: 'calc(100% - 32px)', width: '100%' }}>
                      {/* Line */}
                      <polyline
                        points={monthlyData.slice(0, -1).map((dataPoint, index) => {
                          const filteredMonthlyData = monthlyData.slice(0, -1);
                          const maxActivities = Math.max(...filteredMonthlyData.map(d => d.activitiesCount));
                          const activityHeightPercentage = (dataPoint.activitiesCount / maxActivities) * 100;
                          const totalBars = filteredMonthlyData.length;
                          const barWidth = 100 / totalBars;
                          const x = (index * barWidth) + (barWidth / 2);
                          const y = 100 - activityHeightPercentage;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 text-xs flex-wrap">
                  {viewMode === 'week' ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-indigo-500 opacity-75 rounded"></div>
                        <span className="text-gray-600">Weekly Points</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-0.5 bg-red-500"></div>
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></div>
                          <div className="w-2.5 h-0.5 bg-red-500"></div>
                        </div>
                        <span className="text-gray-600">Avg Activities/Day</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-2 bg-gray-300 rounded-sm"></div>
                        <span className="text-gray-600">Mon-Sun</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-indigo-400 opacity-70 rounded"></div>
                        <span className="text-gray-600">Daily Points</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-0.5 bg-red-500"></div>
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></div>
                          <div className="w-2.5 h-0.5 bg-red-500"></div>
                        </div>
                        <span className="text-gray-600">Activities Count</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                  {viewMode === 'week' ? (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {weeklyData.length > 1 ? (weeklyData.slice(0, -1).reduce((sum, w) => sum + w.totalPoints, 0) / (weeklyData.length - 1)).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Weekly Avg</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {weeklyData.length > 1 ? Math.max(...weeklyData.slice(0, -1).map(w => w.totalPoints)).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Best Week</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {Math.max(0, weeklyData.length - 1)}
                        </div>
                        <div className="text-xs text-gray-600">Total Weeks</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {monthlyData.length > 1 ? (monthlyData.slice(0, -1).reduce((sum, d) => sum + d.points, 0) / (monthlyData.length - 1)).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Daily Avg</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {monthlyData.length > 1 ? Math.max(...monthlyData.slice(0, -1).map(d => d.points)).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Best Day</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {monthlyData.length > 1 ? Math.max(...monthlyData.slice(0, -1).map(d => d.activitiesCount)) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Max Activities</div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>

            ) : (<CardContent className="px-4 pb-4">
              <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">Complete Your Tasks to see monthly chart</p>
              </div>
            </CardContent>))}
          </Card>

          {/* Leaderboard */}
          <Card className="leaderboard-section">
            <button
              onClick={() => toggleSection('leaderboard')}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-gray-900">Leaderboard</span>
              {expandedSections.leaderboard ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />

              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.leaderboard && (
              <CardContent className="px-4 pb-4">
                <LeaderboardPage />
              </CardContent>
            )}
          </Card>

          {/* Log Tracker */}
          <Card className="log-tracker border-0 shadow-sm">
            <button
              onClick={() => toggleSection('logTracker')}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-gray-900 text-base">Daily Log Tracker</span>
              </div>
              {expandedSections.logTracker ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.logTracker && (
              <CardContent className="px-5 pb-5 space-y-4 border-t border-gray-100">
                {/* Date Filter */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                  <label htmlFor="log-date-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Select Date
                  </label>
                  <input
                    id="log-date-filter"
                    type="date"
                    value={logDateFilter}
                    onChange={(e) => setLogDateFilter(e.target.value)}
                    max={DateTime.local().toFormat('yyyy-MM-dd')}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                  />
                  <button
                    onClick={() => setLogDateFilter(DateTime.local().toFormat('yyyy-MM-dd'))}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    Today
                  </button>
                </div>

                {/* Daily Log Details */}
                {selectedDayLog ? (
                  <div className="space-y-4">
                    {/* Summary Header */}
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
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
                              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                                <span className="text-xs font-semibold text-blue-900">
                                  {selectedDayLog.activities.filter(activity => activity.achieved > 0).length} {selectedDayLog.activities.filter(activity => activity.achieved > 0).length === 1 ? 'Activity' : 'Activities'} Completed
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1 justify-end mb-1">
                            <Trophy className="w-5 h-5 text-blue-600" />
                            <p className="text-3xl font-bold text-blue-600">
                              {selectedDayLog.totalPoints.toFixed(2)}
                            </p>
                          </div>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total Points</p>
                        </div>
                      </div>
                      {selectedDayLog.streak > 0 && (
                        <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-blue-200">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-sm">
                            <Flame className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {selectedDayLog.streak} Day Streak Active
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Activities List */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Activity Details</h4>
                      </div>
                      {selectedDayLog.activities.map((activity, index) => (
                        <div
                          key={index}
                          className={`rounded-xl p-4 border-2 transition-all hover:shadow-md ${
                            activity.achieved > 0 
                              ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' 
                              : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${
                                activity.achieved > 0 
                                  ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                                  : 'bg-gradient-to-br from-gray-400 to-slate-500'
                              }`}>
                                {activity.achieved > 0 ? (
                                  <Smile className="w-5 h-5 text-white font-bold" />
                                ) : (
                                  <Frown className="w-5 h-5 text-white font-bold" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-900 mb-1">{activity.activity}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                                    activity.cadance === 'daily' 
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                      : 'bg-purple-100 text-purple-800 border border-purple-200'
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
                              <p className={`text-xs font-semibold uppercase tracking-wide ${
                                activity.achieved <= 0 
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
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
