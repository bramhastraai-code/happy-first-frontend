'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowLeft, TrendingUp, Target, Clock } from 'lucide-react';
import type { WeeklyPlan } from '@/lib/api/weeklyPlan';
import { activityAPI ,Activity} from '@/lib/api/activity';


export default function UpcomingPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken || !user) {
      router.push('/login');
      return;
    }

    const fetchWeeklyPlan = async () => {
      try {
        setLoading(true);
        const response = await weeklyPlanAPI.Upcomming();
        const activityResponse = await activityAPI.getList();
        setActivities(activityResponse.data.data);
        setWeeklyPlan(response.data.data);
        setError('');
      } catch (err: unknown) {
        console.error('Failed to fetch weekly plan:', err);
        const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(errorMessage || 'Failed to load weekly plan');
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyPlan();
  }, [accessToken, user, router, isHydrated]);

  

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTotalPotentialPoints = () => {
    if (!weeklyPlan) return 0;
    return weeklyPlan.activities.reduce((total, activity) => {
      if (activity.cadence === 'daily') {
        return total + ((activity.pointsPerUnit || 0) * 7);
      }
      return total + ((activity.pointsPerUnit || 0) * activity.targetValue);
    }, 0);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading plans...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Upcoming Plans</h1>
            <p className="text-sm text-gray-600">Your weekly activity goals</p>
          </div>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                onClick={() => router.push('/tasks')}
                className="mt-4 bg-red-600 hover:bg-red-700"
              >
                Back to Tasks
              </Button>
            </CardContent>
          </Card>
        )}

        {!error && weeklyPlan && (
          <>
            {/* Plan Overview */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-blue-900 mb-1">Upcoming Weekly Plan</h2>
                    <p className="text-sm text-blue-700">
                      {formatDate(weeklyPlan.weekStart)} - {formatDate(weeklyPlan.weekEnd)}
                    </p>
                  </div>
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {getDaysRemaining(weeklyPlan.weekStart)}
                    </div>
                    <div className="text-xs text-blue-700">Days Left</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {weeklyPlan.activities.length}
                    </div>
                    <div className="text-xs text-blue-700">Activities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">
                      {getTotalPotentialPoints().toFixed(0)}
                    </div>
                    <div className="text-xs text-blue-700">Max Points</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-white">
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-gray-900">
                    {weeklyPlan.activities.filter(a => a.cadence === 'daily').length}
                  </div>
                  <div className="text-xs text-gray-600">Daily Goals</div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-3 text-center">
                  <Target className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-gray-900">
                    {weeklyPlan.activities.filter(a => a.cadence === 'weekly').length}
                  </div>
                  <div className="text-xs text-gray-600">Weekly Goals</div>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardContent className="p-3 text-center">
                  <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-gray-900">
                    {weeklyPlan.unloockedSets?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">Sets Unlocked</div>
                </CardContent>
              </Card>
            </div>

            {/* Activities List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">📋 All Activities</h3>
              
              {/* Daily Activities */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <span className="w-1 h-4 bg-green-500 rounded"></span>
                  Daily Activities
                </h4>
                {weeklyPlan.activities
                  .filter(activity => activity.cadence === 'daily')
                  .map((activity) => {
                    const activityData = typeof activity === 'object' ? activity : null;
                    const activityId = activityData?.activity || '';
                    const isSurprise = activity?.isSurpriseActivity || false;
                    
                    return (
                      <Card key={activityId} className={`${
                        isSurprise 
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 shadow-md relative'
                          : 'bg-white'
                      } hover:shadow-md transition-shadow`}>
                        {isSurprise && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse z-10">
                            🎁 SURPRISE
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl mt-1">
                                {isSurprise ? '🎁' : activities.find(a => a._id === activityId)?.icon || '✅'}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`font-semibold ${isSurprise ? 'text-orange-900' : 'text-gray-900'}`}>
                                    {isSurprise && '⭐ '}{activityData?.label}
                                  </h4>
                                </div>
                                <p className={`text-sm mb-2 ${isSurprise ? 'text-orange-700' : 'text-gray-600'}`}>
                                  Target: <span className={`font-medium ${isSurprise ? 'text-orange-900' : 'text-gray-900'}`}>
                                    {activity.targetValue} {activityData?.unit}/day
                                  </span>
                                  {isSurprise && ' 🎉'}
                                </p>
                                <div className={`flex items-center gap-4 text-xs ${isSurprise ? 'text-orange-600' : 'text-gray-500'}`}>
                                  <span className="flex items-center gap-1">
                                    <span className={`font-medium ${isSurprise ? 'text-orange-700' : 'text-blue-600'}`}>
                                      {activity.pointsPerUnit?.toFixed(2)}
                                    </span>
                                    pts/day
                                  </span>
                                  <span className="flex items-center gap-1">
                                    Max: <span className={`font-medium ${isSurprise ? 'text-orange-700' : 'text-green-600'}`}>
                                      {((activity.pointsPerUnit || 0)  * 7).toFixed(0)}
                                    </span>
                                    pts/week
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              {/* Weekly Activities */}
              {weeklyPlan.activities.filter(a => a.cadence === 'weekly').length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <span className="w-1 h-4 bg-purple-500 rounded"></span>
                    Weekly Activities
                  </h4>
                  {weeklyPlan.activities
                    .filter(activity => activity.cadence === 'weekly')
                    .map((activity) => {
                      const activityData = typeof activity === 'object' ? activity : null;
                      const activityId = activityData?.activity || '';
                      const isSurprise = activity?.isSurpriseActivity|| false;
                      
                      return (
                        <Card key={activityId} className={`${
                          isSurprise 
                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 shadow-md relative'
                            : 'bg-white'
                        } hover:shadow-md transition-shadow`}>
                          {isSurprise && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse z-10">
                              🎁 SURPRISE
                            </div>
                          )}
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="text-2xl mt-1">
                                  {isSurprise ? '🎁' : activities.find(a => a._id === activityId)?.icon || '✅'}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-semibold ${isSurprise ? 'text-orange-900' : 'text-gray-900'}`}>
                                      {isSurprise && '⭐ '}{activityData?.label}
                                    </h4>
                                  </div>
                                  <p className={`text-sm mb-2 ${isSurprise ? 'text-orange-700' : 'text-gray-600'}`}>
                                    Target: <span className={`font-medium ${isSurprise ? 'text-orange-900' : 'text-gray-900'}`}>
                                      {activity.targetValue} {activityData?.unit}/week
                                    </span>
                                    {isSurprise && ' 🎉'}
                                  </p>
                                  <div className={`flex items-center gap-4 text-xs ${isSurprise ? 'text-orange-600' : 'text-gray-500'}`}>
                                    <span className="flex items-center gap-1">
                                      <span className={`font-medium ${isSurprise ? 'text-orange-700' : 'text-blue-600'}`}>
                                        {activity.pointsPerUnit?.toFixed(2)}
                                      </span>
                                      pts/{activityData?.unit}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      Max: <span className={`font-medium ${isSurprise ? 'text-orange-700' : 'text-green-600'}`}>
                                        {((activity.pointsPerUnit || 0) * activity.targetValue).toFixed(0)}
                                      </span>
                                      pts/week
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => router.push('/tasks')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Start Daily Tasks
              </Button>
              <Button
                onClick={() => router.push('/home')}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </>
        )}

        {!error && !weeklyPlan && !loading && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-4xl mb-2">📅</div>
              <h3 className="font-semibold text-yellow-900 mb-2">No Active Plan</h3>
              <p className="text-sm text-yellow-700 mb-3">
                You don&apos;t have an active weekly plan yet. Create one to get started!
              </p>
              <Button
                onClick={() => router.push('/tasks')}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Go to Tasks
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
