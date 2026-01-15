'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type PointLossesData, type DailyActivityLoss, type WeeklyActivityLoss } from '@/lib/api/dailyLog';
import { weeklyPlanAPI, type WeeklyPlanAnalytics } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingDown, AlertCircle, Calendar, Target, Zap, BarChart3, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { DateTime } from 'luxon';

function WeekAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  
  const [pointLosses, setPointLosses] = useState<PointLossesData | null>(null);
  const [analytics, setAnalytics] = useState<WeeklyPlanAnalytics | null>(null);
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
        
        // First, get the current weekly plan to get the ID
        const weeklyPlanResponse = await weeklyPlanAPI.getCurrent(monday.toFormat('yyyy-MM-dd'));
        const weeklyPlanId = weeklyPlanResponse.data.data._id;
        
        // Fetch both analytics and point losses in parallel
        const [analyticsResponse, pointLossesResponse] = await Promise.all([
          weeklyPlanAPI.getAnalytics(weeklyPlanId),
          dailyLogAPI.getPointLosses(monday.toFormat('yyyy-MM-dd'))
        ]);
        
        setAnalytics(analyticsResponse.data.data);
        setPointLosses(pointLossesResponse.data.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch week data:', err);
        setError('Failed to load weekly analysis data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [accessToken, isHydrated, router, searchParams, selectedProfile]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-gray-700 font-medium text-lg">Loading Weekly Analysis...</p>
            <p className="text-gray-500 text-sm mt-2">Analyzing your performance data</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold mb-6 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="max-w-md mx-auto mt-20">
            <div className="bg-white border-2 border-red-200 rounded-2xl p-8 text-center shadow-xl">
              <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Data</h3>
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const weekStart = pointLosses?.weekStart ? DateTime.fromJSDate(new Date(pointLosses.weekStart)).toFormat('MMM dd') : '';
  const weekEnd = pointLosses?.weekEnd ? DateTime.fromJSDate(new Date(pointLosses.weekEnd)).minus({ days: 1 }).toFormat('MMM dd, yyyy') : '';

  const dailyActivities = pointLosses?.pointLossDetails.filter(a => a.cadence === 'daily') as DailyActivityLoss[] || [];
  const weeklyActivities = pointLosses?.pointLossDetails.filter(a => a.cadence === 'weekly') as WeeklyActivityLoss[] || [];

  const getRankBadgeColor = (percentile: number) => {
    if (percentile >= 90) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900';
    if (percentile >= 70) return 'bg-gradient-to-r from-green-400 to-green-600 text-green-900';
    if (percentile >= 50) return 'bg-gradient-to-r from-blue-400 to-blue-600 text-blue-900';
    return 'bg-gradient-to-r from-gray-400 to-gray-600 text-gray-900';
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-all duration-200 hover:gap-3 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200" />
              <span>Back</span>
            </button>
          </div>

          {/* Week Analytics Overview */}
          {analytics && (
            <>
              <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-0 shadow-2xl overflow-hidden">
                <CardContent className="p-6 sm:p-8 relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-white">Week Performance</h1>
                    </div>
                    <p className="text-white/90 mb-6 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-semibold">{weekStart} - {weekEnd}</span>
                    </p>
                    
                    <div className="max-w-md mx-auto">
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-200">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <div className="bg-indigo-100 rounded-xl p-3">
                            <Zap className="w-7 h-7 text-indigo-600" />
                          </div>
                          <p className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Points Achieved</p>
                        </div>
                        <div className="text-center">
                          <p className="text-5xl font-bold text-indigo-600 mb-2">{analytics.summary.totalPointsAchieved.toFixed(1)}</p>
                          <p className="text-base text-gray-600 font-medium">out of {analytics.summary.totalPointsAllocated.toFixed(1)} possible points</p>
                          {/* <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">Completion Rate</p>
                            <p className="text-2xl font-bold text-purple-600">{analytics.summary.overallCompletionPercentage}%</p>
                          </div> */}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Rankings and Analytics */}
              <Card className="border-0 shadow-xl bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-2.5 shadow-md">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Activity Rankings & Performance</h2>
                  </div>

                  <div className="space-y-5">
                    {analytics.activities.map((activity, index) => (
                      <div key={index} className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-5 border-2 border-indigo-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                        {/* Activity Header with Rank Badge */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="text-lg font-bold text-gray-900">{activity.activityLabel}</h3>
                              {activity.rank && (
                                <span className={`text-xs font-bold text-white px-3 py-1.5 rounded-full shadow-md ${getRankBadgeColor(activity.rankPercentile)}`}>
                                  #{activity.rank}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-medium capitalize">{activity.cadence}</span>
                              </span>
                              <span className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg">
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span className="font-medium">{activity.unit}</span>
                              </span>
                            </div>
                          </div>
                          <div className="text-right bg-white rounded-xl p-3 shadow-md">
                            <p className="text-2xl font-bold text-green-600">{activity.totalPointsAchieved.toFixed(1)}</p>
                            <p className="text-xs text-gray-500 font-medium">of {activity.pointsAllocated.toFixed(1)} pts</p>
                          </div>
                        </div>

                        {/* Rank Info */}
                        {activity.rank && (
                          <div className="bg-white rounded-xl p-4 mb-4 border-2 border-indigo-100 shadow-md">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex text-white items-center justify-center font-bold text-base shadow-lg ${getRankBadgeColor(activity.rankPercentile)}`}>
                                  {activity.rank}
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Your Rank</p>
                                  <p className="text-sm font-bold text-gray-900">out of {activity.totalParticipants} participants</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">{activity.rankPercentile}%</p>
                                <p className="text-xs text-gray-600 font-semibold">Percentile</p>
                              </div>
                            </div>
                            <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full rounded-full shadow-sm transition-all duration-500 ${getRankBadgeColor(activity.rankPercentile).split(' ')[0]}`}
                                style={{ width: `${activity.rankPercentile}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Progress */}
                        <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                          <div className="flex items-center justify-between text-sm mb-3">
                            <span className="text-gray-700 font-semibold">Progress</span>
                            <span className="font-bold text-gray-900 text-base">
                              {activity.achievedUnits} / {activity.cadence=="daily"?activity.targetValue*7:activity.targetValue} {activity.unit}
                            </span>
                          </div>
                          <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full shadow-sm transition-all duration-500 ${
                                activity.achievementPercentage >= 100
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : activity.achievementPercentage >= 70
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                  : activity.achievementPercentage >= 50
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-red-500 to-rose-500'
                              }`}
                              style={{ width: `${Math.min(activity.achievementPercentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-2">
                            <span className={`font-bold ${
                              activity.achievementPercentage >= 100 ? 'text-green-600' :
                              activity.achievementPercentage >= 70 ? 'text-blue-600' :
                              activity.achievementPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>{activity.achievementPercentage}% complete</span>
                            {activity.pendingUnits > 0 && (
                              <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-lg">
                                {activity.pendingUnits} {activity.unit} remaining
                              </span>
                            )}
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

          {/* Point Loss Analysis Section */}
          <Card className="bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 border-0 shadow-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">Point Loss Analysis</h1>
                </div>
                <p className="text-white/90 mb-6 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold">{weekStart} - {weekEnd}</span>
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-green-100 rounded-lg p-2">
                        <Zap className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Earned</p>
                    </div>
                    <p className="text-4xl font-bold text-green-600">{pointLosses?.totalPointsEarned.toFixed(1) || 0}</p>
                    <p className="text-sm text-gray-500 font-medium mt-1">Points</p>
                  </div>
                  
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-lg transform hover:scale-105 transition-transform duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-red-100 rounded-lg p-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lost</p>
                    </div>
                    <p className="text-4xl font-bold text-red-600">{pointLosses?.totalPointsLost.toFixed(1) || 0}</p>
                    <p className="text-sm text-gray-500 font-medium mt-1">Points</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md">
                    <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Potential</p>
                    <p className="text-2xl font-bold text-indigo-600">{pointLosses?.totalPotentialPoints.toFixed(1) || 0}</p>
                  </div>
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md">
                    <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Loss %</p>
                    <p className="text-2xl font-bold text-orange-600">{pointLosses?.lossPercentage || 0}%</p>
                  </div>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-white font-semibold">Achievement Rate</span>
                    <span className="text-white font-bold text-lg">
                      {pointLosses ? ((pointLosses.totalPointsEarned / pointLosses.totalPotentialPoints) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="h-4 bg-white/30 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-out shadow-lg"
                      style={{ 
                        width: `${pointLosses ? (pointLosses.totalPointsEarned / pointLosses.totalPotentialPoints) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Activities Losses */}
          {dailyActivities.length > 0 && (
            <Card className="border-0 shadow-xl bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-2.5 shadow-md">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Daily Activities</h2>
                  <span className="ml-auto text-sm bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-md">
                    {dailyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)} pts lost
                  </span>
                </div>

                <div className="space-y-5">
                  {dailyActivities.map((activity, index) => (
                    <div key={index} className="bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
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
            <Card className="border-0 shadow-xl bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-2.5 shadow-md">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Weekly Activities</h2>
                  <span className="ml-auto text-sm bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-md">
                    {weeklyActivities.reduce((sum, a) => sum + a.pointsLost, 0).toFixed(1)} pts lost
                  </span>
                </div>

                <div className="space-y-5">
                  {weeklyActivities.map((activity, index) => (
                    <div key={index} className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-2xl p-5 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
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
            <Card className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 border-0 shadow-2xl overflow-hidden">
              <CardContent className="p-6 sm:p-8 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Week Summary</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
                      <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">Total Activities</p>
                      <p className="text-4xl font-bold text-indigo-600">{pointLosses.summary.totalActivities}</p>
                    </div>
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
                      <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">With Losses</p>
                      <p className="text-4xl font-bold text-orange-600">{pointLosses.summary.activitiesWithLosses}</p>
                    </div>
                  </div>

                  {/* Improvement Tips */}
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💡</span> Key Insights
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-700">
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default function WeekAnalysisPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </MainLayout>
    }>
      <WeekAnalysisContent />
    </Suspense>
  );
}
