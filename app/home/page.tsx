'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { dailyLogAPI } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Trophy, Flame, Activity, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import type { WeeklySummary } from '@/lib/api/dailyLog';

export default function HomePage() {
  const router = useRouter();
  const { user, accessToken, isHydrated, logout } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    weeklyPerformance: false,
    activityGoals: false,
    leaderboard: false,
    streakTracker: false,
    recommendations: false,
  });

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
        const [planRes, summaryRes] = await Promise.all([
          weeklyPlanAPI.getCurrent(),
          dailyLogAPI.getSummary('weekly'),
        ]);
        setWeeklyPlan(planRes.data.data);
        setSummary(summaryRes.data.data as WeeklySummary);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [accessToken, user, router, isHydrated]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const stats = {
    points: summary?.totalPoints || 0,
    rank: 3, // This would come from leaderboard API
    streak: 16, // This would come from user data
    efficiency: 88, // This would be calculated
  };

  return (
    <MainLayout>
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
          {/* Points Card */}
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-pink-700">Points</span>
                <Zap className="w-4 h-4 text-pink-600" />
              </div>
              <div className="text-3xl font-bold text-pink-900 mb-1">{stats.points}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-pink-700">Cap: 100</span>
                <span className="text-pink-600 font-medium">+12</span>
              </div>
              <div className="mt-2 h-1.5 bg-pink-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-600 rounded-full"
                  style={{ width: `${stats.points}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          {/* Rank Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">Rank (weekly)</span>
                <Trophy className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-1">#{stats.rank}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700">77.78%</span>
                <span className="text-purple-600 font-medium">Top 25%</span>
              </div>
              <div className="mt-2 h-1.5 bg-purple-200 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: '77%' }}></div>
              </div>
            </CardContent>
          </Card>

          {/* Streak Card */}
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
          </Card>

          {/* Efficiency Card */}
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
          </Card>
        </div>

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
              <span className="font-semibold text-gray-900">Weekly Performance</span>
              {expandedSections.weeklyPerformance ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.weeklyPerformance && (
              <CardContent className="px-4 pb-4">
                <div className="h-40 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Performance chart will be displayed here</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Activity Goals */}
          <Card>
            <button
              onClick={() => toggleSection('activityGoals')}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-gray-900">Activity Goals</span>
              {expandedSections.activityGoals ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {expandedSections.activityGoals && weeklyPlan && (
              <CardContent className="px-4 pb-4 space-y-3">
                {weeklyPlan.activities.map((activity, index) => {
                  const activityData = typeof activity === 'object' 
                    ? activity 
                    : null;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
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
                          {activity.achievedUnits || 0} / {activity.targetValue}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(((activity.achievedUnits || 0) / activity.targetValue) * 100)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
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

          {/* Streak Tracker */}
          <Card>
            <button
              onClick={() => toggleSection('streakTracker')}
              className="w-full p-4 flex items-center justify-between"
            >
              <span className="font-semibold text-gray-900">Streak Tracker</span>
              {expandedSections.streakTracker ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </Card>

          {/* Smart Recommendations */}
          <Card>
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
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
