'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { dailyLogAPI, type DailySummary, type MonthlySummary } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Trophy, Flame, Activity, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import type { WeeklySummary } from '@/lib/api/dailyLog';
import WelcomeBanner from '@/components/ui/WelcomeBanner';



interface MonthlyDataPoint {
  date: string;
  points: number;
  day: number;
  activitiesCount: number;
}

// Generate deterministic monthly data (last 30 days)
//  async function  generateMonthlyData( ): Promise<MonthlyDataPoint[]> {

//   const data: MonthlyDataPoint[] = [];

//   for (let i = 29; i >= 0; i--) {
//     const date = new Date(today);
//     date.setDate(date.getDate() - i);

//     // Use deterministic data based on date to avoid hydration mismatch
//     const seed = date.getDate() + date.getMonth() * 31;
//     const points = 20 + (seed % 50); // Deterministic points between 20-70
//     const activitiesCount = 1 + (seed % 7); // Activities count between 1-7

//     data.push({
//       date: date.toISOString().split('T')[0],
//       points: points,
//       day: date.getDate(),
//       activitiesCount: activitiesCount,
//     });
//   }

//   return data;
// };

export default function HomePage() {
  const router = useRouter();
  const { user, accessToken, isHydrated, logout } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyDataPoint[]>([]);
  const [monthlyLogData, setMonthlyLogData] = useState<number | null>(null);

  const [noPlanError, setNoPlanError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    weeklyPerformance: false,
    activityGoals: false,
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
        const [planRes, summaryRes, dailyRes, monthlyRes] = await Promise.all([
          weeklyPlanAPI.getCurrent(),
          dailyLogAPI.getSummary('weekly', today.toISOString().split('T')[0]),
          dailyLogAPI.getSummary('daily', today.toISOString().split('T')[0]).catch(() => null),
          dailyLogAPI.getSummary("monthly", today.toISOString().split('T')[0])

        ]);
        setMonthlyData((monthlyRes.data.data as MonthlySummary).dailyBreakdown.map(item => ({
          date: item.date,
          points: item.points,
          activitiesCount: item.activityCount,
        }) as MonthlyDataPoint));
        setMonthlyLogData((monthlyRes.data.data as MonthlySummary ).totalDaysLogged);
        setWeeklyPlan(planRes.data.data);
        setSummary(summaryRes.data.data as WeeklySummary);
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
      
      if (isUserCreatedToday&& localStorage.getItem('hasSeenWelcomeBanner')!=null&&localStorage.getItem('hasSeenWelcomeBanner')==='false') {
        setShowWelcomeBanner(true);
      }
    };
    fetchData();
  }, [accessToken, user, router, isHydrated]);

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
  }, [logDateFilter, accessToken]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCloseWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    localStorage.setItem('hasSeenWelcomeBanner', 'true');
  };

  const stats = {
    points: summary?.totalPoints || 0,
    rank: 3, // This would come from leaderboard API
    streak: 16, // This would come from user data
    efficiency: 88, // This would be calculated
  };

  return (
    <MainLayout>
      {/* Welcome Banner for New Users */}
      {showWelcomeBanner  && (
        <WelcomeBanner
          userName={user?.name || 'there'}
          onClose={handleCloseWelcomeBanner}
        />
      )}

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Hello, <span className="font-semibold text-gray-900">{user?.name}</span>
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">Week 47</span>
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Live
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
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

          {/* Streak Card
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-cyan-700">Streak</span>
                <Flame className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-3xl font-bold text-cyan-900 mb-1">{stats.streak}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-700">Best: 28</span>
                <span className="text-cyan-600 font-medium">+12</span>
              </div>
              <div className="mt-2 h-1.5 bg-cyan-200 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-600 rounded-full" style={{ width: '57%' }}></div>
              </div>
            </CardContent>
          </Card> */}

          {/* Efficiency Card
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Efficiency</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-1">{stats.efficiency}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700">Daily Avg</span>
                <span className="text-blue-600 font-medium">Excellent</span>
              </div>
              <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Monthly Points Chart */}
        

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
            {expandedSections.weeklyPerformance &&( monthlyLogData !== null ? (

              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Monthly Points</h3>
                    <p className="text-xs text-gray-600">Last 30 days performance</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-600">
                      {monthlyData.reduce((sum, d) => sum + d.points, 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Total Points</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="relative h-40 flex items-end gap-0.5 pb-6">
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
                            className={`w-full rounded-t-sm transition-all duration-300 ${isToday
                              ? 'bg-indigo-500 opacity-90'
                              : isWeekend
                                ? 'bg-indigo-400 opacity-80'
                                : 'bg-indigo-400 opacity-70'
                              } hover:opacity-100 cursor-pointer`}
                            style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-20">
                              <div className="font-semibold">{dataPoint.points} pts</div>
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
                          <div className="text-xs text-gray-500 absolute" style={{ bottom: 0 }}>
                            {dataPoint.day}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Line connecting activity circles */}
                  <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: 'calc(100% - 24px)', width: '100%' }}>
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

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-indigo-400 opacity-70 rounded"></div>
                    <span className="text-gray-600">Points (bars)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-0.5 bg-red-500"></div>
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></div>
                      <div className="w-2.5 h-0.5 bg-red-500"></div>
                    </div>
                    <span className="text-gray-600">Activities (line)</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {(monthlyData.reduce((sum, d) => sum + d.points, 0) / monthlyData.length).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Daily Avg</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {Math.max(...monthlyData.map(d => d.points)).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600">Best Day</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {Math.max(...monthlyData.map(d => d.activitiesCount))}
                    </div>
                    <div className="text-xs text-gray-600">Max Activities</div>
                  </div>
                </div>
              </CardContent>

            ):( <CardContent className="px-4 pb-4">
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
                                {activity.targetValue} {activityData?.unit}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">
                              {activity.achieved || 0} / {activity.targetValue}
                            </p>
                            <p className="text-xs text-gray-500">
                              {progressPercentage}%
                            </p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
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
                    max={new Date().toISOString().split('T')[0]}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setLogDateFilter(new Date().toISOString().split('T')[0])}
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
                                  {activity.achieved} / {activity.target} {activity.unit}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-green-600">
                                +{activity.pointsEarned.toFixed(2)} pts
                              </p>
                              <p className="text-xs text-gray-500">
                                {activity.status}
                              </p>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${Math.min(activity.achieved / activity.target * 100, 100)}%` }}
                            ></div>
                          </div>
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

          {/* Smart Recommendations */}
          {/* <Card>
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-gray-900">Smart Recommendations</span>
              {expandedSections.recommendations ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </Card> */}
        </div>
      </div>
    </MainLayout>
  );
}
