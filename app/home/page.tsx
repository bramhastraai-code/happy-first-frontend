'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, getCookie, setCookie } from '@/lib/store/authStore';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { dailyLogAPI, type DailySummary, type MonthlySummary } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Trophy, Flame, Activity, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import type { WeeklySummary } from '@/lib/api/dailyLog';
import WelcomeBanner from '@/components/ui/WelcomeBanner';
import LeaderboardPage from '@/components/ui/leaderboard/page';
import { authAPI } from '@/lib/api/auth';
import { ProfileBadge } from '@/components/ui/ProfileBadge';
import { ProfileSwitcher } from '@/components/ui/ProfileSwitcher';
import { Settings } from 'lucide-react';
import { DateTime } from 'luxon';



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
  totalPoints: number;
  avgActivities: number;
  daysCount: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, accessToken, isHydrated, logout,selectedProfile } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [monthlyLogData, setMonthlyLogData] = useState<number | null>(null);
  const [userData, setUser] = useState<typeof user | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

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

  const handleLogout = () => {
    logout();
    router.push('/login');
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
        
        const [planRes, summaryRes, dailyRes, monthlyRes,userInfo] = await Promise.all([
          weeklyPlanAPI.getCurrent(),
          dailyLogAPI.getSummary('weekly', localDateString),
          dailyLogAPI.getSummary('daily', localDateString).catch(() => null),
          dailyLogAPI.getSummary("monthly", localDateString),
          authAPI.userInfo(),

        ]);
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
      const isUserCreatedToday = user?.createdAt
        ? new Date(user.createdAt).toDateString() === new Date().toDateString()
        : false;

      if (isUserCreatedToday && getCookie('hasSeenWelcomeBanner') != null && getCookie('hasSeenWelcomeBanner') === 'false') {
        setShowWelcomeBanner(true);
      }
    };
    fetchData();
  }, [accessToken, user, router, isHydrated,selectedProfile]);

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
      {/* Welcome Banner for New Users */}
      {showWelcomeBanner && (
        <WelcomeBanner
          userName={user?.name || 'there'}
          onClose={handleCloseWelcomeBanner}
        />
      )}

      <div className="p-4 space-y-4 ">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
            <div className="hidden min-[520px]:flex items-center gap-2">
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
        <div className="grid grid-cols-2 gap-3">
          {/* Today's Score Card */}
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-pink-700">Today&apos;s Score</span>
                <Zap className="w-4 h-4 text-pink-600" />
              </div>
              <div className="text-3xl font-bold text-pink-900 mb-1">{dailySummary?.totalPoints.toFixed(2) || 0}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-pink-700">Points earned</span>
              </div>
              {/* <div className="mt-2 h-1.5 bg-pink-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-600 rounded-full"
                  style={{ width: `${Math.min((dailySummary?.totalPoints || 0), 100)}%` }}
                ></div>
              </div> */}
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

        {/* Monthly Points Chart */}


        {/* Pending Activities */}
        <Card>
          {expandedSections.pendingActivities && (
            <CardContent className="p-4 space-y-3">
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Pending Activities</h1>
              {noPlanError ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">⏳</div>
                  <h3 className="font-semibold text-yellow-900 text-sm mb-1">No Pending Activities</h3>
                  <p className="text-xs text-yellow-700">Create a weekly plan to see pending activities.</p>
                </div>
              ) : weeklyPlan ? (
                <>
                  {weeklyPlan.activities.filter(activity => {
                    if (activity.cadence === 'daily') {
                      return true;
                    } else if (activity.cadence === 'weekly') {
                      return activity.targetValue - (activity.achievedUnits || 0) > 0;
                    }
                    return false;
                  }).length > 0 ? (
                    weeklyPlan.activities
                      .filter(activity => {
                        if (activity.cadence === 'daily') {
                          return true;
                        } else if (activity.cadence === 'weekly') {
                          return activity.targetValue - (activity.achievedUnits || 0) > 0;
                        }
                        return false;
                      })
                      .map((activity, index) => {
                      const activityData = typeof activity === 'object' ? activity : null;
                      // Calculate remaining weeks
                      const weekEnd = new Date(weeklyPlan.weekEnd);
                      const today = new Date();
                      const remainingDays = Math.max(0, Math.ceil((weekEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                      const remainingWeeks = (remainingDays / 7).toFixed(1);
                      const remaining = activity.cadence === 'daily' ? activity.targetValue*remainingDays - ((activity.TodayLogged) ? (activity.targetValue):( 0)) :activity.targetValue - (activity.achievedUnits || 0);

                      return (
                        <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">⏳</span>
                              <div>
                                <p className="font-medium text-sm text-gray-900">{activityData?.label || 'Activity'}</p>
                                <p className="text-xs text-gray-600">
                                  {activity.cadence === 'daily' ? 'Daily' : 'Weekly'} • {activityData?.unit}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-orange-600">
                                { remaining} {activityData?.unit} left
                              </p>
                              <p className="text-xs text-gray-500">
                                {remainingDays-(activity.TodayLogged?1 :0)} Day{parseFloat(remainingWeeks) !== 1 ? 's' : ''} remaining
                              </p>
                            </div>
                          </div>

                          {/* <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium text-gray-900">
                                {activity.achievedUnits || 0} / {activity.cadence === 'daily' ? activity.targetValue*7 : activity.targetValue} ({progressPercentage}%)
                              </span>
                            </div>
                            <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              ></div>
                            </div>
                          </div> */}

                          {activity.cadence === 'daily' && activity.dailyTargets && (
                            <div className="mt-3 pt-3 border-t border-orange-200">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">Daily target</span>
                                <span className="font-medium text-orange-700">
                                  {activity.dailyTargets*7} {activityData?.unit}/day
                                </span>
                              </div>
                            </div>
                          )}

                          {/* {activity.pendingUnits !== undefined && activity.pendingUnits > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-orange-700">
                              <span className="font-medium">⚠️ {activity.pendingUnits} {activityData?.unit} pending</span>
                            </div>
                          )} */}
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-3xl mb-2">🎉</div>
                      <h3 className="font-semibold text-green-900 text-sm mb-1">All Caught Up!</h3>
                      <p className="text-xs text-green-700">You&apos;ve completed all your activities for this week.</p>
                    </div>
                  )}
                  
                  {/* Completed Activities Section */}
                  {weeklyPlan.activities.filter(activity => {
                    return activity.cadence === 'weekly' && activity.targetValue - (activity.achievedUnits || 0) <= 0;
                  }).length > 0 && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">Completed Activities</h2>
                      {weeklyPlan.activities
                        .filter(activity => {
                          return activity.cadence === 'weekly' && activity.targetValue - (activity.achievedUnits || 0) <= 0;
                        })
                        .map((activity, index) => {
                          const activityData = typeof activity === 'object' ? activity : null;
                          
                          return (
                            <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">✅</span>
                                  <div>
                                    <p className="font-medium text-sm text-gray-900">{activityData?.label || 'Activity'}</p>
                                    <p className="text-xs text-gray-600">
                                      Weekly • {activityData?.unit}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-green-600">
                                    Completed!
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {activity.achievedUnits || 0} / {activity.targetValue} {activityData?.unit}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300"
                                    style={{ width: '100%' }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Loading pending activities...</p>
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
          <Card>
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
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                          viewMode === 'day'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Day
                      </button>
                      <button
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                          viewMode === 'week'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Week
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-indigo-600">
                        {viewMode === 'week' 
                          ? weeklyData.reduce((sum, w) => sum + w.totalPoints, 0).toFixed(1)
                          : monthlyData.reduce((sum, d) => sum + d.points, 0).toFixed(1)
                        }
                      </div>
                      <div className="text-xs text-gray-600">Total Points</div>
                    </div>
                  </div>
                </div>

                {/* Chart - Conditional Day/Week View */}
                {viewMode === 'week' ? (
                  /* Weekly View */
                <div className="relative h-48 flex items-end gap-2 pb-10">
                  {weeklyData.map((week, index) => {
                    const maxPoints = Math.max(...weeklyData.map(w => w.totalPoints));
                    const heightPercentage = (week.totalPoints / maxPoints) * 100;
                    const isCurrentWeek = index === weeklyData.length - 1;

                    // Calculate activity trend line position
                    const maxActivities = Math.max(...weeklyData.map(w => w.avgActivities));
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
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              isCurrentWeek
                                ? 'bg-gradient-to-t from-indigo-600 to-indigo-500 opacity-95 shadow-lg'
                                : 'bg-gradient-to-t from-indigo-500 to-indigo-400 opacity-75'
                            } hover:opacity-100 cursor-pointer hover:shadow-xl`}
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
                      points={weeklyData.map((week, index) => {
                        const maxActivities = Math.max(...weeklyData.map(w => w.avgActivities));
                        const activityHeightPercentage = (week.avgActivities / maxActivities) * 100;
                        const totalBars = weeklyData.length;
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
                    {monthlyData.map((dataPoint, index) => {
                      const maxPoints = Math.max(...monthlyData.map(d => d.points));
                      const heightPercentage = (dataPoint.points / maxPoints) * 100;
                      const isToday = index === monthlyData.length - 1;
                      const isWeekend = new Date(dataPoint.date).getDay() % 6 === 0;

                      // Calculate activity trend line position
                      const maxActivities = Math.max(...monthlyData.map(d => d.activitiesCount));
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
                              className={`w-full rounded-t-sm transition-all duration-300 ${
                                isToday
                                  ? 'bg-indigo-500 opacity-90'
                                  : isWeekend
                                    ? 'bg-indigo-400 opacity-80'
                                    : 'bg-indigo-400 opacity-70'
                              } hover:opacity-100 cursor-pointer`}
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
                        points={monthlyData.map((dataPoint, index) => {
                          const maxActivities = Math.max(...monthlyData.map(d => d.activitiesCount));
                          const activityHeightPercentage = (dataPoint.activitiesCount / maxActivities) * 100;
                          const totalBars = monthlyData.length;
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
                          {weeklyData.length > 0 ? (weeklyData.reduce((sum, w) => sum + w.totalPoints, 0) / weeklyData.length).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Weekly Avg</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {weeklyData.length > 0 ? Math.max(...weeklyData.map(w => w.totalPoints)).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Best Week</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {weeklyData.length}
                        </div>
                        <div className="text-xs text-gray-600">Total Weeks</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">
                          {monthlyData.length > 0 ? (monthlyData.reduce((sum, d) => sum + d.points, 0) / monthlyData.length).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Daily Avg</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.points)).toFixed(1) : 0}
                        </div>
                        <div className="text-xs text-gray-600">Best Day</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.activitiesCount)) : 0}
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

          {/* Activity Goals */}
          <Card>
            <button
              onClick={() => toggleSection('activityGoals')}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-gray-900">Today`s Activity Goals</span>
              {expandedSections.activityGoals ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.activityGoals && (
              <CardContent className="px-4 pb-4 space-y-3">
                {noPlanError ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">📅</div>
                    <h3 className="font-semibold text-yellow-900 text-sm mb-1">No Active Weekly Plan</h3>
                    <p className="text-xs text-yellow-700 mb-3">{noPlanError}</p>

                  </div>
                ) : weeklyPlan ? (
                  weeklyPlan.activities.map((activity, index) => {
                    const activityData = typeof activity === 'object'
                      ? activity
                      : null;
                    const progressPercentage = Math.min(
                      Math.round(((activity.achieved || 0) / activity.targetValue) * 100),
                      100
                    );

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🏃</span>
                            <div>
                              <p className="font-medium text-sm">{activityData?.label || 'Activity'}</p>
                              <p className="text-xs text-gray-600">
                                {activity.targetValue} {activityData?.unit} ({activity.cadence === 'daily' ? 'Daily' : 'Weekly'})
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                             + {activity.achieved || 0} <span className="text-sm font-normal text-gray-500">{activityData?.unit}</span>
                            </p>
                             
                          </div>
                        </div>
                        {/* <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div> */}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Loading activities...</p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Leaderboard */}
          <Card>
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
          <Card>
            <button
              onClick={() => toggleSection('logTracker')}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-gray-900">Log Tracker</span>
              {expandedSections.logTracker ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.logTracker && (
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Date Filter */}
                <div className="flex items-center gap-2 mb-3">
                  <label htmlFor="log-date-filter" className="text-sm font-medium text-gray-700">
                    Select Date:
                  </label>
                  <input
                    id="log-date-filter"
                    type="date"
                    value={logDateFilter}
                    onChange={(e) => setLogDateFilter(e.target.value)}
                    max={DateTime.local().toFormat('yyyy-MM-dd')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setLogDateFilter(DateTime.local().toFormat('yyyy-MM-dd'))}
                    className="px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                </div>

                {/* Daily Log Details */}
                {selectedDayLog ? (
                  <div className="space-y-3">
                    {/* Summary Header */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📅</span>
                          <div>
                            <p className="font-semibold text-sm text-blue-900">
                              {new Date(selectedDayLog.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-blue-700">
                              {selectedDayLog.activities.filter(activity => activity.achieved > 0).length} {selectedDayLog.activities.filter(activity => activity.achieved > 0).length === 1 ? 'activity' : 'activities'} logged
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            +{selectedDayLog.totalPoints.toFixed(2)}
                          </p>
                          <p className="text-xs text-blue-700">Total Points</p>
                        </div>
                      </div>
                      {selectedDayLog.streak > 0 && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {selectedDayLog.streak} day streak
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Activities List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900">Activities</h4>
                      {selectedDayLog.activities.map((activity, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🏃</span>
                              <div>
                                <p className="font-medium text-sm text-gray-900">{activity.activity}</p>
                                <p className="text-xs text-gray-600">
                                  {activity.cadance === 'daily' ? `${activity.achieved} / ${activity.target} • ${activity.unit} ` : activity.unit==='days' ? (activity.achieved ? `Completed for ${logDateFilter} ` : `Not Completed for ${logDateFilter}`) : ((activity.achieved>0&&activity.pointsEarned==0)?`${activity.achieved} ${activity.unit} /No Left  `:`${activity.achieved} / ${activity.target} • ${activity.unit} `)}  {activity.cadance === 'daily' ? '(Daily)' : `(Weekly)`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-600">
                                +{activity.pointsEarned.toFixed(2)} pts
                              </p>
                              <p className="text-xs text-gray-500">
                               {activity.cadance==='weekly'&& (activity.achieved>0&&activity.pointsEarned==0)? "Already":""} {activity.status}
                              </p>
                            </div>
                          </div>
                          {activity.cadance=="weekly"&&(activity.achieved>0&&activity.pointsEarned==0) ?(<></>):(<div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${Math.min(activity.achieved / activity.target * 100, 100)}%` }}
                            ></div>
                          </div>)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No activities logged for this date</p>
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
