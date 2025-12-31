'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type PointLossesData, type DailyActivityLoss, type WeeklyActivityLoss } from '@/lib/api/dailyLog';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingDown, AlertCircle, Calendar, Target, Zap, BarChart3, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { DateTime } from 'luxon';

export default function WeekAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  
  const [pointLosses, setPointLosses] = useState<PointLossesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;

    if (!accessToken) {
      router.push('/login');
      return;
    }

    const weekStartString = searchParams.get('weekStart');
    if (!weekStartString) {
      setError('Week date not provided');
      setLoading(false);
      return;
    }

    const weekStartParam = new Date(weekStartString);

    const fetchWeekData = async () => {
      try {
        setLoading(true);
        
        // Parse and validate the date
        const startDate = DateTime.fromJSDate(weekStartParam);
        if (!startDate.isValid) {
          setError(`Invalid date format: ${weekStartParam}`);
          setLoading(false);
          return;
        }
        
        // Get Monday of the week
        const monday = startDate.startOf('week');
        
        // Fetch point losses data
        const response = await dailyLogAPI.getPointLosses(monday.toFormat('yyyy-MM-dd'));
        setPointLosses(response.data.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch point losses:', err);
        setError('Failed to load point loss data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [accessToken, isHydrated, router, searchParams, selectedProfile]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading point loss analysis...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const weekStart = pointLosses?.weekStart ? DateTime.fromJSDate(new Date(pointLosses.weekStart)).toFormat('MMM dd') : '';
  const weekEnd = pointLosses?.weekEnd ? DateTime.fromJSDate(new Date(pointLosses.weekEnd)).minus({ days: 1 }).toFormat('MMM dd, yyyy') : '';

  const dailyActivities = pointLosses?.pointLossDetails.filter(a => a.cadence === 'daily') as DailyActivityLoss[] || [];
  const weeklyActivities = pointLosses?.pointLossDetails.filter(a => a.cadence === 'weekly') as WeeklyActivityLoss[] || [];

  return (
    <MainLayout>
      <div className="p-4 space-y-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        {/* Week Overview */}
        <Card className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-6 h-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">Point Loss Analysis</h1>
            </div>
            <p className="text-gray-700 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{weekStart} - {weekEnd}</span>
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 border-2 border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-medium text-gray-600">Points Earned</p>
                </div>
                <p className="text-3xl font-bold text-green-600">{pointLosses?.totalPointsEarned.toFixed(1) || 0}</p>
              </div>
              
              <div className="bg-white rounded-xl p-4 border-2 border-red-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <p className="text-xs font-medium text-gray-600">Points Lost</p>
                </div>
                <p className="text-3xl font-bold text-red-600">{pointLosses?.totalPointsLost.toFixed(1) || 0}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Potential Points</p>
                <p className="text-xl font-bold text-indigo-600">{pointLosses?.totalPotentialPoints.toFixed(1) || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Loss Percentage</p>
                <p className="text-xl font-bold text-orange-600">{pointLosses?.lossPercentage || 0}%</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-600">Achievement Rate</span>
                <span className="font-semibold text-gray-900">
                  {pointLosses ? ((pointLosses.totalPointsEarned / pointLosses.totalPotentialPoints) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                  style={{ 
                    width: `${pointLosses ? (pointLosses.totalPointsEarned / pointLosses.totalPotentialPoints) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Activities Losses */}
        {dailyActivities.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Daily Activities</h2>
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  {dailyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)} pts lost
                </span>
              </div>

              <div className="space-y-4">
                {dailyActivities.map((activity, index) => (
                  <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                    {/* Activity Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{activity.activity}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Daily Activity
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            {activity.unit}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{activity.earnedPoints.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">of {activity.potentialPoints.toFixed(1)} pts</p>
                      </div>
                    </div>

                    {/* Loss Indicator */}
                    {activity.pointsLost > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="font-semibold text-red-900 text-sm">
                            {activity.pointsLost.toFixed(1)} Points Lost
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white rounded p-2">
                            <span className="text-gray-600">Missed Days: </span>
                            <span className="font-semibold text-red-600">{activity.missedDays.length}</span>
                          </div>
                          <div className="bg-white rounded p-2">
                            <span className="text-gray-600">Partial Days: </span>
                            <span className="font-semibold text-orange-600">{activity.partialDays.length}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Missed Days Details */}
                    {activity.missedDays.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-500" />
                          Missed Days
                        </h4>
                        <div className="space-y-1">
                          {activity.missedDays.map((day, idx) => (
                            <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-sm font-medium text-gray-900">
                                  {DateTime.fromISO(day.date).toFormat('EEE, MMM dd')}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-red-600">-{day.pointsLost.toFixed(1)} pts</p>
                                <p className="text-xs text-gray-600">Not logged</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Partial Days Details */}
                    {activity.partialDays.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-orange-500" />
                          Incomplete Days
                        </h4>
                        <div className="space-y-1">
                          {activity.partialDays.map((day, idx) => (
                            <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {DateTime.fromISO(day.date).toFormat('EEE, MMM dd')}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-orange-600">-{day.pointsLost.toFixed(1)} pts</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600">
                                  {day.achieved} / {day.target} {day.unit}
                                </span>
                                <span className="text-orange-700 font-medium">
                                  {((day.achieved / day.target) * 100).toFixed(0)}% complete
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 bg-yellow-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-yellow-500 rounded-full"
                                  style={{ width: `${(day.achieved / day.target) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weekly Activities Losses */}
        {weeklyActivities.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Weekly Activities</h2>
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                  {weeklyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)} pts lost
                </span>
              </div>

              <div className="space-y-4">
                {weeklyActivities.map((activity, index) => (
                  <div key={index} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
                    {/* Activity Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{activity.activity}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Weekly Target
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {activity.daysLogged} days logged
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{activity.earnedPoints.toFixed(1)}</p>
                        <p className="text-xs text-gray-500">of {activity.potentialPoints.toFixed(1)} pts</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="bg-white rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-700">Progress</span>
                        <span className="font-semibold text-gray-900">
                          {activity.achieved.toFixed(1)} / {activity.target.toFixed(1)} {activity.unit}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (activity.achieved / activity.target) >= 1
                              ? 'bg-green-500'
                              : (activity.achieved / activity.target) >= 0.5
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min((activity.achieved / activity.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-600">
                          {((activity.achieved / activity.target) * 100).toFixed(0)}% complete
                        </span>
                        {activity.pointsLost > 0 && (
                          <span className="text-red-600 font-semibold">
                            -{activity.pointsLost.toFixed(1)} pts lost
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shortfall */}
                    {activity.achieved < activity.target && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-red-900">
                            <span className="font-semibold">{(activity.target - activity.achieved).toFixed(1)} {activity.unit}</span> short of target
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {pointLosses && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Week Summary
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Total Activities</p>
                  <p className="text-2xl font-bold text-indigo-600">{pointLosses.summary.totalActivities}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">Activities with Losses</p>
                  <p className="text-2xl font-bold text-orange-600">{pointLosses.summary.activitiesWithLosses}</p>
                </div>
              </div>

              {/* Improvement Tips */}
              <div className="mt-4 bg-white rounded-lg p-3 border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Key Insights</h3>
                <ul className="space-y-2 text-xs text-gray-700">
                  {dailyActivities.some(a => a.missedDays.length > 0) && (
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>You have missed days. Daily consistency is key to maximizing points.</span>
                    </li>
                  )}
                  {dailyActivities.some(a => a.partialDays.length > 0) && (
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500">•</span>
                      <span>Some daily targets weren&apos;t fully met. Small improvements each day add up!</span>
                    </li>
                  )}
                  {weeklyActivities.some(a => a.achieved < a.target) && (
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">•</span>
                      <span>Focus on weekly activities early in the week to avoid last-minute pressure.</span>
                    </li>
                  )}
                  {parseFloat(pointLosses.lossPercentage) < 20 && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-500">•</span>
                      <span>Great job! You&apos;re losing less than 20% of potential points. Keep it up!</span>
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
