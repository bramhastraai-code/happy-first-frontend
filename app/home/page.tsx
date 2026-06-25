'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, getCookie, setCookie } from '@/lib/store/authStore';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { dailyLogAPI, type DailySummary, type MonthlySummary, type StreakData, type CalendarData } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame, Activity, ChevronDown, ChevronUp, LogOut, Smile, Calendar, TrendingUp, Frown } from 'lucide-react';
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
  const [isShowingPreviousWeek, setIsShowingPreviousWeek] = useState(false);
  const [weeklyLogData, setWeeklyLogData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

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
    pendingActivities: false,
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
  const isProfilePaused = Boolean(selectedProfile?.pause ?? selectedProfile?.setting?.pause);

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

        // Fetch streak data and calendar data if selectedProfile is available
        if (selectedProfile?._id) {
          try {
            const streakRes = await dailyLogAPI.getStreaks(selectedProfile._id);
            setStreakData(streakRes.data.data);
          } catch (error) {
            console.error('Failed to fetch streak data:', error);
          }

          try {
            const now = new Date();
            const calendarRes = await dailyLogAPI.getCalendar(selectedProfile._id, now.getMonth() + 1, now.getFullYear());
            setWeeklyLogData(calendarRes.data.data);
          } catch (error) {
            console.error('Failed to fetch calendar data:', error);
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

        const currentPlan = planRes.data.data;
        if (!currentPlan) {
          setWeeklyPlan(null);
          setNoPlanError('No active weekly plan found. Create a weekly plan to track your activity goals.');

          try {
            const upcomingPlanData = await weeklyPlanAPI.getUpcomingPlan();
            if (upcomingPlanData) {
              setUpcomingPlan(upcomingPlanData);
            }
          } catch (upcomingError) {
            console.log('No upcoming plan found:', upcomingError);
          }
        } else {
          setWeeklyPlan(currentPlan);
          setNoPlanError('');
          setUpcomingPlan(null);
        }

        // Check if user has logged this week
        const currentWeekSummary = summaryRes.data.data as WeeklySummary;
        if (currentWeekSummary.totalDaysLogged === 0) {
          // User hasn't logged this week, fetch previous week's data
          try {
            const previousWeekDate = DateTime.local().minus({ days: 7 }).toFormat('yyyy-MM-dd');
            const previousWeekRes = await dailyLogAPI.getSummary('weekly', previousWeekDate);
            setSummary(previousWeekRes.data.data as WeeklySummary);
            setIsShowingPreviousWeek(true);
          } catch (error) {
            console.error('Failed to fetch previous week data:', error);
            // Fallback to current week (which is 0)
            setSummary(currentWeekSummary);
            setIsShowingPreviousWeek(false);
          }
        } else {
          // User has logged this week, show current week data
          setSummary(currentWeekSummary);
          console.log('sasdadf');

          setIsShowingPreviousWeek(false);
        }

        setUser(userInfo.data.data);
        if (dailyRes?.data?.data) {
          setDailySummary(dailyRes.data.data as DailySummary);
        }
      } catch (error: unknown) {
        console.error('Failed to fetch data:', error);
        const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (errorMessage === 'No active weekly plan found') {
          setNoPlanError('No active weekly plan found. Create a weekly plan to track your activity goals.');

          // Check for upcoming plan for new users
          try {
            const upcomingPlanData = await weeklyPlanAPI.getUpcomingPlan();
            if (upcomingPlanData) {
              setUpcomingPlan(upcomingPlanData);
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
      
      // Set loading to false after all data is fetched
      setLoading(false);
    };
    fetchData();
  }, [accessToken, user, router, isHydrated, selectedProfile]);
  console.log(isShowingPreviousWeek);


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

  useEffect(() => {
    if (!accessToken || !selectedProfile?._id || !logDateFilter) return;

    const fetchCalendarForSelectedMonth = async () => {
      try {
        const selected = DateTime.fromISO(logDateFilter);
        if (!selected.isValid) return;

        const calendarRes = await dailyLogAPI.getCalendar(
          selectedProfile._id,
          selected.month,
          selected.year
        );
        setWeeklyLogData(calendarRes.data.data);
      } catch (error) {
        console.error('Failed to fetch tracker calendar data:', error);
      }
    };

    fetchCalendarForSelectedMonth();
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

  // Get current week's days (Monday to Sunday)
  const getCurrentWeekDays = () => {
    const now = DateTime.local();
    const startOfWeek = now.startOf('week'); // Monday
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = startOfWeek.plus({ days: i });
      const dateString = day.toFormat('yyyy-MM-dd');
      const calendarDay = weeklyLogData?.calendarDays.find(d => d.date.split('T')[0] == dateString);
      
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
  const trackerCalendarDays = weeklyLogData?.calendarDays || [];
  const trackerFirstDayOffset = trackerCalendarDays.length > 0
    ? new Date(trackerCalendarDays[0].date).getDay()
    : 0;
  const todayDate = DateTime.local().toFormat('yyyy-MM-dd');
  const selectedDateCalendarDay = trackerCalendarDays.find((d) => d.date.split('T')[0] === logDateFilter);
  const selectedDateHasLog = selectedDateCalendarDay?.hasLog || false;
  const selectedDateIsToday = logDateFilter === todayDate;
  const selectedDayStreak =
    typeof selectedDayLog?.streak === 'number'
      ? selectedDayLog.streak
      : (selectedDateIsToday ? (streakData?.overallStreak.currentStreak || 0) : 0);
  console.log(weekDays,"ds");
  
  // Show loading state while data is being fetched
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Loading your dashboard...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we fetch your data</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      {/* Guided Tour - Only render on client */}
      {isMounted && <GuidedTour run={runTour} onFinish={handleTourFinish} />}

      {/* Welcome Banner for New Users */}
      {showWelcomeBanner && (
        <WelcomeBanner
          userName={user?.name || 'there'}
          onClose={handleCloseWelcomeBanner}
        />
      )}

      <div className="w-full px-1 py-3 sm:px-2 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="welcome-banner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-lg border-4 border-white shrink-0 transition-transform hover:scale-105">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight truncate drop-shadow-sm">
                  Welcome back,
                </p>
                <ProfileBadge />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-gray-700 font-semibold truncate drop-shadow-sm">{new Date().toDateString()}</span>
                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full font-semibold shadow-sm ${isProfilePaused ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'}`}> 
                  <span className={`w-1.5 h-1.5 rounded-full ${isProfilePaused ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  {isProfilePaused ? 'Paused' : 'Active'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Hide ProfileSwitcher and Logout on mobile (< 520px) */}
            <div className="profile-switcher hidden min-[520px]:flex items-center gap-2">
              <ProfileSwitcher />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-200 hover:border-red-300"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
            <button
              onClick={() => router.push('/settings')}
              className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-lg transition-all border border-gray-200 hover:border-gray-300"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

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
        <Card className="bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-6 h-6 text-indigo-600 drop-shadow-md" />
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">This Week&apos;s Progress</h2>
            </div>
            <div className="overflow-x-auto pb-1">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[420px] sm:min-w-0">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => !day.isFuture && handleBarClick(day.date)}
                  className={`
                    flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all
                    ${day.isToday ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105' : ''}
                    ${day.isFuture ? 'opacity-50' : 'cursor-pointer hover:bg-indigo-50 hover:scale-105'}
                  `}
                >
                  <div className="text-xs font-semibold text-gray-700 mb-1 tracking-wide">
                    {day.dayName}
                  </div>
                  <div
                    className={`
                      w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all
                      ${day.hasLog
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-xl scale-110'
                        : day.isFuture
                        ? 'bg-gray-100 border-2 border-gray-200'
                        : 'bg-white border-2 border-indigo-200 hover:border-indigo-400'
                      }
                    `}
                  >
                    {day.hasLog ? (
                      <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse" />
                    ) : (
                      <Flame className="w-6 h-6 sm:w-7 sm:h-7 text-gray-300" />
                    )}
                  </div>
                  <div className={`
                    text-xs font-bold mt-1 tracking-tight
                    ${day.isToday ? 'text-indigo-600' : 'text-gray-600'}
                  `}>
                    {day.dayNumber}
                  </div>
                </div>
              ))}
            </div>
            </div>
            <div className="mt-3 pt-3 border-t border-indigo-200">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-gray-700 font-semibold">
                  {weekDays.filter(d => d.hasLog).length} / 7 days logged
                </span>
                <span className="flex items-center gap-1 text-orange-600 font-bold">
                  <Flame className="w-4 h-4" />
                  Keep it up!
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="stats-grid grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 sm:gap-4 mt-2 sm:mt-4">
          {/* Current Streak Card */}
          <Card
            className="bg-gradient-to-br from-orange-100 via-orange-50 to-yellow-50 border-2 border-orange-200 cursor-pointer hover:shadow-lg hover:scale-[1.03] transition-all min-h-[110px] sm:min-h-[120px] group"
            onClick={() => router.push('/streak-calendar')}
          >
            <CardContent className="p-3 sm:p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-orange-700 tracking-wide">Streak</span>
                <Flame className="w-5 h-5 text-orange-500 animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-orange-900 mb-1 flex items-center gap-1 drop-shadow-sm">
                {streakData?.overallStreak.currentStreak || 0}
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
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 min-h-[110px] sm:min-h-[120px]">
            <CardContent className="p-3 sm:p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-700 tracking-wide">
                  {isShowingPreviousWeek ? 'Previous Week Score' : 'Week Score'}
                </span>
                <Trophy className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-purple-900 mb-1 drop-shadow-sm flex items-center gap-1">
                {stats.points.toFixed(2)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700">{summary?.totalDaysLogged || 0} days logged</span>
                {isShowingPreviousWeek && (
                  <span className="text-purple-600 font-medium bg-purple-200 px-1.5 py-0.5 rounded">Last Week</span>
                )}
              </div>
              <div className="mt-2 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.min((summary?.totalPoints || 0), 100)}%` }}></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Activities */}
        <Card className="pending-activities bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-100 shadow-lg mt-2 sm:mt-4">
          <button
            onClick={() => toggleSection('pendingActivities')}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
          >
           <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">📋</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Pending Activities</h1>
              </div>
            {expandedSections.pendingActivities ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {expandedSections.pendingActivities && (
            <CardContent className="p-4 sm:p-6 space-y-5">
              
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
            </CardContent>
          )}
        </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-pink-100 border-2 border-pink-200 shadow-lg mt-2 sm:mt-4">
        <CardContent className="p-5 sm:p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-xl">
              <span className="text-white text-2xl">✨</span>
            </div>
            <h3 className="font-extrabold text-gray-900 text-xl tracking-tight drop-shadow-sm">AI Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-blue-100 via-indigo-50 to-indigo-200 rounded-2xl p-5 border-2 border-blue-200 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span className="text-base font-extrabold text-blue-900 tracking-tight">Rank Up Alert</span>
                </div>
                <span className="text-xs font-bold text-white bg-emerald-500 px-3 py-1 rounded-full shadow">92%</span>
              </div>
              <p className="text-sm text-blue-800 mb-3 leading-relaxed font-medium">
                Only 7 points away from #2 spot. Focus on running +10km this week.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                <span>→</span>
                <span>Increase run frequency to 4x/week</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-100 via-orange-50 to-orange-200 rounded-2xl p-5 border-2 border-amber-200 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚠️</span>
                <span className="text-base font-extrabold text-amber-900 tracking-tight">Streak Risk</span>
              </div>
              <p className="text-sm text-amber-800 mb-3 leading-relaxed font-medium">
                Sleep streak at risk. Complete today to maintain momentum.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                <span>→</span>
                <span>Target 7+ hours tonight</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expandable Sections */}
      <div className="space-y-4 mt-2 sm:mt-4">
        {/* Weekly Performance */}
        <Card className="weekly-performance bg-white border-gray-200 shadow-sm">
          <button
            onClick={() => toggleSection('weeklyPerformance')}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                <span className="text-white text-lg">📊</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">Monthly Performance</span>
            </div>
            {expandedSections.weeklyPerformance ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {expandedSections.weeklyPerformance && (monthlyLogData !== null ? (

            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{viewMode === 'week' ? 'Weekly Distribution' : 'Daily Performance'}</h3>
                  <p className="text-xs text-gray-600">{viewMode === 'week' ? 'Recent weeks (Mon-Sun)' : 'Last 30 days'}</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                    <button
                      onClick={() => setViewMode('day')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-all flex-1 sm:flex-none ${viewMode === 'day'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setViewMode('week')}
                      className={`px-3 py-1 text-xs font-medium rounded transition-all flex-1 sm:flex-none ${viewMode === 'week'
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
                <div className="overflow-x-auto pb-1">
                <div className="relative h-48 min-w-[560px] sm:min-w-0 flex items-end gap-2 pb-10">
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
                </div>
              ) : (
                /* Daily View */
                <div className="overflow-x-auto pb-1">
                <div className="relative h-48 min-w-[560px] sm:min-w-0 flex items-end gap-0.5 pb-8">
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
        <Card className="leaderboard-section bg-gradient-to-br from-yellow-50 via-orange-50 to-orange-100 border-2 border-yellow-200 shadow-lg">
          <button
            onClick={() => toggleSection('leaderboard')}
            className="w-full p-5 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-md">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">Leaderboard</span>
            </div>
            {expandedSections.leaderboard ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {expandedSections.leaderboard && (
            <CardContent className="px-3 sm:px-5 pb-5">
              <LeaderboardPage />
            </CardContent>
          )}
        </Card>

        {/* Log Tracker */}
        <Card className="log-tracker bg-white border-gray-200 shadow-sm">
          <button
            onClick={() => toggleSection('logTracker')}
            className="w-full p-5 flex items-center justify-between hover:bg-blue-50 transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="font-extrabold text-gray-900 text-lg tracking-tight drop-shadow-sm">Daily Log Tracker</span>
            </div>
            {expandedSections.logTracker ? (
              <ChevronUp className="w-5 h-5 text-indigo-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-indigo-400" />
            )}
          </button>
          {expandedSections.logTracker && (
            <CardContent className="px-2 sm:px-5 pb-5 space-y-4 border-t border-indigo-100">
              {/* Calendar View */}
              <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl border border-indigo-100 shadow-sm sm:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 tracking-tight">
                    {weeklyLogData?.monthName || DateTime.local().toFormat('LLLL')} {weeklyLogData?.year || DateTime.local().year}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-semibold">
                    <span className="flex items-center gap-1 text-emerald-700 whitespace-nowrap">
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500"></span>
                      Submitted
                    </span>
                    <span className="flex items-center gap-1 text-rose-700 whitespace-nowrap">
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-rose-500"></span>
                      Not Submitted
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1.5 sm:mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <div key={day} className="text-center text-[10px] sm:text-[12px] font-bold text-indigo-400 py-0.5 sm:py-1 tracking-wide">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {Array.from({ length: trackerFirstDayOffset }).map((_, index) => (
                    <div key={`tracker-empty-${index}`} className="aspect-square" />
                  ))}

                  {trackerCalendarDays.map((day) => {
                    const dateOnly = day.date.split('T')[0];
                    const isSelected = logDateFilter === dateOnly;
                    const baseClasses = day.isFuture
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : day.hasLog
                        ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-sm'
                        : 'bg-rose-400 text-white border-rose-400 hover:bg-rose-500 shadow-sm';

                    return (
                      <button
                        key={day.date}
                        type="button"
                        disabled={day.isFuture}
                        onClick={() => !day.isFuture && setLogDateFilter(dateOnly)}
                        className={`relative aspect-square w-full rounded-lg sm:rounded-xl border text-xs sm:text-sm font-bold transition-all ${baseClasses} ${
                          isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 sm:ring-offset-2 scale-[1.02] border-indigo-500' : ''
                        }`}
                        style={{ minWidth: 0, minHeight: 0 }}
                        title={`${dateOnly} - ${day.hasLog ? 'Submitted' : 'Not Submitted'}`}
                      >
                        <span className="inline-flex h-full w-full items-center justify-center">
                          {day.day}
                        </span>
                        {!day.isFuture && (
                          <span
                            className={`absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full ${day.hasLog ? 'bg-emerald-100' : 'bg-rose-100'}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 shadow-sm">
                <label htmlFor="log-date-filter" className="text-sm font-bold text-indigo-700 whitespace-nowrap">
                  Select Date
                </label>
                <input
                  id="log-date-filter"
                  type="date"
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  max={DateTime.local().toFormat('yyyy-MM-dd')}
                  className="flex-1 px-4 py-2.5 border-2 border-indigo-200 rounded-lg text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white shadow-md"
                />
                <button
                  onClick={() => setLogDateFilter(DateTime.local().toFormat('yyyy-MM-dd'))}
                  className="px-5 py-2.5 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                >
                  Today
                </button>
              </div>

              {!selectedDateHasLog && (
                <button
                  onClick={() => {
                    if (selectedDateIsToday) {
                      router.push('/tasks');
                      return;
                    }
                    router.push(`/previous-log?date=${logDateFilter}`);
                  }}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-base font-extrabold text-white shadow-lg transition hover:from-indigo-700 hover:to-blue-700 mt-2"
                >
                  {selectedDateIsToday ? 'Log Today Activity' : 'Log Selected Date Activity'}
                </button>
              )}

              {/* Daily Log Details */}
              {selectedDayLog ? (
                <div className="space-y-4">
                  {/* Summary Header */}
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 rounded-xl p-5 border border-blue-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
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
                    {selectedDayStreak > 0 && (
                      <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-blue-200">
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
                      <div className="w-1 h-5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
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
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${activity.achieved > 0
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
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${activity.cadance === 'daily'
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
            </CardContent>
          )}
        </Card>
      </div>
    </div>
    </MainLayout >
  );
}
