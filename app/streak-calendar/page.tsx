'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type CalendarData, type ActivityCalendarData, type StreakData } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, Trophy, Calendar as CalendarIcon } from 'lucide-react';

type FilterType = 'overall' | 'activity';

export default function StreakCalendarPage() {
  const router = useRouter();
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [activityCalendarData, setActivityCalendarData] = useState<ActivityCalendarData | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('overall');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken || !selectedProfile) {
      router.push('/login');
      return;
    }

    fetchStreakData();
  }, [accessToken, isHydrated, selectedProfile, router]);

  useEffect(() => {
    if (selectedProfile?._id) {
      fetchCalendarData();
    }
  }, [currentMonth, currentYear, selectedProfile, filterType, selectedActivityId]);

  const fetchStreakData = async () => {
    if (!selectedProfile?._id) return;
    
    try {
      setLoading(true);
      const response = await dailyLogAPI.getStreaks(selectedProfile._id);
      setStreakData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    if (!selectedProfile?._id) return;

    try {
      if (filterType === 'activity' && selectedActivityId) {
        // Fetch activity-specific calendar
        const response = await dailyLogAPI.getActivityCalendar(
          selectedProfile._id,
          selectedActivityId,
          currentMonth,
          currentYear
        );
        setActivityCalendarData(response.data.data);
        setCalendarData(null);
      } else {
        // Fetch overall calendar
        const response = await dailyLogAPI.getCalendar(
          selectedProfile._id,
          currentMonth,
          currentYear
        );
        setCalendarData(response.data.data);
        setActivityCalendarData(null);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  const handlePreviousMonth = () => {
    const currentCalendar = activityCalendarData || calendarData;
    if (currentCalendar?.pagination.canGoPrevious) {
      setCurrentMonth(currentCalendar.pagination.previousMonth.month);
      setCurrentYear(currentCalendar.pagination.previousMonth.year);
    }
  };

  const handleNextMonth = () => {
    const currentCalendar = activityCalendarData || calendarData;
    if (currentCalendar?.pagination.canGoNext) {
      setCurrentMonth(currentCalendar.pagination.nextMonth.month);
      setCurrentYear(currentCalendar.pagination.nextMonth.year);
    }
  };

  const handleFilterChange = (type: FilterType) => {
    setFilterType(type);
    if (type === 'overall') {
      setSelectedActivityId('');
    }
  };

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivityId(activityId);
    setFilterType('activity');
  };

  const getDayClassName = (day: any) => {
    let baseClass = 'aspect-square flex flex-col items-center justify-center rounded-lg border transition-all p-1';
    
    if (day.isFuture) {
      return `${baseClass} bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed`;
    }
    
    if (day.isToday) {
      return `${baseClass} ${
        day.hasLog 
          ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-400 shadow-md' 
          : 'bg-gradient-to-br from-red-100 to-red-200 border-red-400 shadow-md'
      } ring-2 ring-blue-500 cursor-pointer hover:scale-105`;
    }
    
    if (day.hasLog) {
      return `${baseClass} bg-green-50 border-green-300 hover:bg-green-100 cursor-pointer hover:scale-105`;
    }
    
    return `${baseClass} bg-red-50 border-red-300 hover:bg-red-100 cursor-pointer hover:scale-105`;
  };

  const handleDayClick = (day: any) => {
    if (day.isFuture) return;
    
    // Extract date in YYYY-MM-DD format
    const dateStr = day.date.split('T')[0];
    
    // Navigate to home page with date as query parameter
    router.push(`/home?date=${dateStr}`);
  };

  const getSelectedActivityStreak = () => {
    if (!selectedActivityId || !streakData) return null;
    return streakData.activityStreaks.find(a => a.activityId === selectedActivityId);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading streak data...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const selectedActivityStreak = getSelectedActivityStreak();
  const displayStreak = filterType === 'activity' && selectedActivityStreak 
    ? selectedActivityStreak 
    : streakData?.overallStreak;

  return (
    <MainLayout>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Streak Calendar</h1>
            <p className="text-sm text-gray-600">Track your consistency over time</p>
          </div>
        </div>

        {/* Streak Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Current Streak</span>
              </div>
              <div className="text-3xl font-bold text-orange-900">
                {filterType === 'activity' && selectedActivityStreak 
                  ? selectedActivityStreak.currentStreak 
                  : streakData?.overallStreak.currentStreak || 0} 🔥
              </div>
              <p className="text-xs text-orange-700 mt-1">days in a row</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Longest Streak</span>
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {filterType === 'activity' && selectedActivityStreak 
                  ? selectedActivityStreak.longestStreak 
                  : streakData?.overallStreak.longestStreak || 0} 🏆
              </div>
              <p className="text-xs text-purple-700 mt-1">
                {filterType === 'activity' && selectedActivityStreak
                  ? `${selectedActivityStreak.totalDaysLogged} days logged`
                  : `${streakData?.overallStreak.totalDaysLogged || 0} days logged`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">View Streak By</h2>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleFilterChange('overall')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filterType === 'overall'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => handleFilterChange('activity')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filterType === 'activity'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Activity-wise
              </button>
            </div>

            {/* Activity Selection */}
            {filterType === 'activity' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Activity</label>
                <select
                  value={selectedActivityId}
                  onChange={(e) => handleActivitySelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Choose an activity...</option>
                  {streakData?.activityStreaks.map((activity) => (
                    <option key={activity.activityId} value={activity.activityId}>
                      {activity.activityName} (Current: {activity.currentStreak} days)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePreviousMonth}
                disabled={!(activityCalendarData || calendarData)?.pagination.canGoPrevious}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="text-center">
                <h3 className="font-semibold text-lg text-gray-900">
                  {activityCalendarData?.activityName && (
                    <div className="text-sm text-indigo-600 mb-1">{activityCalendarData.activityName}</div>
                  )}
                  {(activityCalendarData || calendarData)?.monthName} {(activityCalendarData || calendarData)?.year}
                </h3>
              </div>

              <button
                onClick={handleNextMonth}
                disabled={!(activityCalendarData || calendarData)?.pagination.canGoNext}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {(activityCalendarData?.calendarDays || calendarData?.calendarDays)?.map((day: any) => (
                <div
                  key={day.date}
                  className={getDayClassName(day)}
                  title={`${day.dayOfWeek}, ${day.date.split('T')[0]}`}
                  onClick={() => handleDayClick(day)}
                >
                  <span className="text-sm font-medium text-gray-700">{day.day}</span>
                  <span className="text-lg">
                    {day.isFuture ? '⏳' : day.hasLog ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar Statistics */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              {activityCalendarData ? (
                // Activity-specific statistics
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {activityCalendarData.statistics.daysLogged || 0}
                      </p>
                      <p className="text-xs text-gray-600">Days Logged</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {activityCalendarData.statistics.daysNotLogged || 0}
                      </p>
                      <p className="text-xs text-gray-600">Days Missed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {activityCalendarData.statistics.completionPercentage || 0}%
                      </p>
                      <p className="text-xs text-gray-600">Completion</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-center pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xl font-bold text-indigo-900">
                        {activityCalendarData.statistics.totalValue || 0}
                      </p>
                      <p className="text-xs text-gray-600">
                        Total {activityCalendarData.calendarDays.find(d => d.unit)?.unit || 'Value'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-green-900">
                        {activityCalendarData.statistics.totalPoints.toFixed(2) || 0}
                      </p>
                      <p className="text-xs text-gray-600">Points Earned</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Overall statistics
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {calendarData?.statistics.daysLogged || 0}
                    </p>
                    <p className="text-xs text-gray-600">Days Logged</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {calendarData?.statistics.daysNotLogged || 0}
                    </p>
                    <p className="text-xs text-gray-600">Days Missed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {calendarData?.statistics.completionPercentage || 0}%
                    </p>
                    <p className="text-xs text-gray-600">Completion</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Legend</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-50 border border-green-300 rounded flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
                <span className="text-sm text-gray-700">Logged</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-50 border border-red-300 rounded flex items-center justify-center">
                  <span className="text-lg">✗</span>
                </div>
                <span className="text-sm text-gray-700">Missed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 border-2 border-blue-500 rounded flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
                <span className="text-sm text-gray-700">Today (Logged)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-50 border border-gray-200 rounded flex items-center justify-center opacity-50">
                  <span className="text-lg">⏳</span>
                </div>
                <span className="text-sm text-gray-700">Future</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
