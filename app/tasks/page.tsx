'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type SubmitDailyLogData } from '@/lib/api/dailyLog';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';

export default function TasksPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [activities, setActivities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated) return;

    if (!accessToken || !user) {
      router.push('/login');
      return;
    }

    const fetchWeeklyPlan = async () => {
      try {
        const response = await weeklyPlanAPI.getCurrent();
        setWeeklyPlan(response.data.data);
        
        // Initialize activity values
        const initialValues: Record<string, number> = {};
        response.data.data.activities.forEach((activity: WeeklyPlanActivity) => {
          const activityId = typeof activity.activityId === 'object' 
            ? activity.activityId._id 
            : activity.activityId;
          initialValues[activityId] = 0;
        });
        setActivities(initialValues);
      } catch (err) {
        console.error('Failed to fetch weekly plan:', err);
      }
    };

    fetchWeeklyPlan();
  }, [accessToken, user, router, isHydrated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const submitData: SubmitDailyLogData = {
        activities: Object.entries(activities)
          .filter(([, value]) => value > 0)
          .map(([activityId, value]) => ({
            activityId,
            value,
          })),
      };

      const response = await dailyLogAPI.submit(submitData);
      setSuccess(`Daily log submitted! Points earned: ${response.data.data.totalPoints}`);
      
      // Reset form
      const resetValues: Record<string, number> = {};
      weeklyPlan?.activities.forEach((activity) => {
        const activityId = typeof activity.activityId === 'object' 
          ? activity.activityId._id 
          : activity.activityId;
        resetValues[activityId] = 0;
      });
      setActivities(resetValues);
    } catch (err) {
      setError((err as any).response?.data?.message || 'Failed to submit daily log');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityChange = (activityId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setActivities((prev) => ({ ...prev, [activityId]: numValue }));
  };

  const getTodayProgress = () => {
    const completed = Object.values(activities).filter((v) => v > 0).length;
    const total = weeklyPlan?.activities.length || 0;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const progress = getTodayProgress();

  return (
    <MainLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Daily Tasks</h1>
          <p className="text-sm text-gray-600">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Today's Progress */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-blue-900 mb-1">Today&apos;s Progress</h2>
                <div className="flex gap-4 text-sm">
                  <span className="text-blue-700">
                    <span className="font-bold text-2xl text-blue-900">{progress.completed}</span>
                    <span className="text-blue-700">/{progress.total}</span>
                  </span>
                  <span className="text-blue-600 font-medium">
                    {Math.round(progress.percentage)}%
                  </span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all" 
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-gray-600 mb-1">Completed</div>
              <div className="text-2xl font-bold text-blue-600">
                {progress.completed}/{progress.total * 7}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-gray-600 mb-1">Streak</div>
              <div className="text-2xl font-bold text-green-600">Safe ✓</div>
            </CardContent>
          </Card>
        </div>

        {/* Streak Alerts */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm">⚠️ Streak Alerts</h3>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">🏃</span>
                <div className="flex-1">
                  <p className="font-medium text-red-900 text-sm">Runs</p>
                  <p className="text-xs text-red-700">Run today or lose 5-day streak!</p>
                </div>
                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded">2d left</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">😴</span>
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 text-sm">Sleep</p>
                  <p className="text-xs text-yellow-700">7 hrs needed to maintain streak</p>
                </div>
                <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded">1d left</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Tasks Form */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">📋 Today&apos;s Tasks</h3>
          
          {success && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {weeklyPlan?.activities.map((activity) => {
              const activityData = typeof activity.activityId === 'object' 
                ? activity.activityId 
                : null;
              const activityId = activityData?._id || '';
              
              return (
                <Card key={activityId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {activityData?.name === 'Steps' && '👣'}
                          {activityData?.name === 'Sleep' && '😴'}
                          {activityData?.name === 'Water' && '💧'}
                          {activityData?.name === 'Yoga' && '🧘'}
                          {activityData?.name === 'Gym' && '🏋️'}
                          {activityData?.name === 'Floors' && '🏢'}
                          {!['Steps', 'Sleep', 'Water', 'Yoga', 'Gym', 'Floors'].includes(activityData?.name || '') && '✅'}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{activityData?.name}</p>
                          <p className="text-xs text-gray-600">
                            Target: {activity.targetValue} {activityData?.baseUnit}
                            {activity.cadence === 'daily' ? '/day' : '/week'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        High
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={activities[activityId] || 0}
                        onChange={(e) => handleActivityChange(activityId, e.target.value)}
                        placeholder={`Enter ${activityData?.baseUnit}`}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 min-w-20 text-right">
                        0.00 / 5 pts
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button
              type="submit"
              disabled={loading || progress.completed === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Submitting...' : 'Submit Daily Log'}
            </Button>
          </form>
        </div>

        {/* Floors Climbed Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg">🏢</span>
              <div className="flex-1">
                <p className="font-medium text-sm">Floors Climbed</p>
                <p className="text-xs text-gray-600">Medium</p>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              0 / 5 km • 0.00 / 5 pts
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
