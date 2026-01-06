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
import { Activity, Calendar, ChevronRight, Lock, Timer, Clock } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import GuidedTour from '@/components/ui/GuidedTour';
import { tasksTourSteps } from '@/lib/utils/tourSteps';
import { HelpCircle } from 'lucide-react';

export default function TasksPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [activities, setActivities] = useState<Record<string, number>>({});
  const [checkboxActivities, setCheckboxActivities] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [noPlanError, setNoPlanError] = useState('');
  const [timeUntilMidnight, setTimeUntilMidnight] = useState('');
  const [isAfter6PM, setIsAfter6PM] = useState(false);
  const [userData, setUserData] = useState(null);
  const [runTour, setRunTour] = useState(false);
  const [showTourButton, setShowTourButton] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => { 
     const fetchUser =async()=>{
      try{
        const userData=await authAPI.userInfo();
        useAuthStore.getState().setUser(userData.data.data);
        setUserData(userData.data.data);
      }
      catch(err){
        console.error('Failed to fetch user data:', err);
      }
    }
    fetchUser();
  },[]);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!isHydrated) return;

    if (!accessToken || !user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [planResponse,] = await Promise.all([
          weeklyPlanAPI.getCurrent(),
        ]);
        
        setWeeklyPlan(planResponse.data.data);
        setNoPlanError('');
        
        // Initialize activity values
        const initialValues: Record<string, number> = {};
        const initialCheckboxValues: Record<string, boolean> = {};
        planResponse.data.data.activities.forEach((activity: WeeklyPlanActivity) => {
          const activityId = typeof activity.activity === 'object' 
            ? activity.activity 
            : activity.activity;
          
          // Check if it's a weekly activity with "days" unit
          if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
            initialCheckboxValues[activityId] = false;
          } else {
            initialValues[activityId] = 0;
          }
        });
        setActivities(initialValues);
        setCheckboxActivities(initialCheckboxValues);
        
        // Set summaries
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err);
        const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (errorMessage === 'No active weekly plan found') {
          setNoPlanError('No active weekly plan found. Please create a weekly plan first to start logging your daily activities.');
        }
      }
    };
    fetchData();
  }, [accessToken, user, router, isHydrated]);


  // Timer countdown effect
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Check if it's after 6 PM (18:00)
      const after6PM = currentHour >= 18;
      setIsAfter6PM(after6PM);

      if (after6PM) {
        // After 6 PM, show time until 6 AM next day (when logs reset)
        const next6AM = new Date();
        next6AM.setDate(next6AM.getDate() + 1);
        next6AM.setHours(18, 0, 0, 0);
        
        const diff = next6AM.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeUntilMidnight(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        // Before 6 PM, show time until 6 PM today
        const next6PM = new Date();
        next6PM.setHours(18, 0, 0, 0);
        
        const diff = next6PM.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimeUntilMidnight(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Combine numeric activities and checkbox activities
      const numericActivities = Object.entries(activities)
        .filter(([, value]) => value > 0)
        .map(([activityId, value]) => ({
          activityId,
          value,
        }));
      
      const checkboxActivityEntries = Object.entries(checkboxActivities)
        .map(([activityId, checked]) => ({
          activityId,
          value: checked ? 1 : 0,
        }));
      
      const submitData: SubmitDailyLogData = {
        activities: [...numericActivities, ...checkboxActivityEntries],
      };

      const response = await dailyLogAPI.submit(submitData);
      setSuccess(`Daily log submitted! Points earned: ${response.data.data.totalPoints}`);
      
      if(response.status===201){
        // Update weeklyPlan to mark all activities as logged for today
        setWeeklyPlan(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            activities: prev.activities.map(activity => ({
              ...activity,
              TodayLogged: true
            }))
          };
        });
      }
      
      // Reset form
      const resetValues: Record<string, number> = {};
      const resetCheckboxValues: Record<string, boolean> = {};
      weeklyPlan?.activities.forEach((activity) => {
        const activityId = typeof activity.activity === 'object' 
          ? activity.activity 
          : activity.activity;
        
        if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
          resetCheckboxValues[activityId] = false;
        } else {
          resetValues[activityId] = 0;
        }
      });
      setActivities(resetValues);
      setCheckboxActivities(resetCheckboxValues);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit daily log');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityChange = (activityId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setActivities((prev) => ({ ...prev, [activityId]: numValue }));
  };

  const handleCheckboxChange = (activityId: string, checked: boolean) => {
    setCheckboxActivities((prev) => ({ ...prev, [activityId]: checked }));
  };

  const getTodayProgress = () => {
    if (!weeklyPlan) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    let completed = 0;
    const total = weeklyPlan.activities.length;

    weeklyPlan.activities.forEach((activity) => {
      const activityId = typeof activity.activity === 'object' 
        ? activity.activity 
        : activity.activity;
      
      if(activity.cadence=="daily"&&activity.achieved &&activity.achieved>=activity.targetValue){
        completed += 1;
      }
      if(activity.cadence==="weekly" && activity.unit.toLowerCase()==="days" && activity.achieved==1){
        completed += 1;
      }
      if(activity.cadence==="weekly" && activity.unit.toLowerCase()!=="days"){
        const dailyTarget = activity.targetValue / 7;
        if(activity.achieved&&activity.achieved>=dailyTarget){
          completed += 1;
        }
      }
    });

    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const progress = getTodayProgress();

  const handleStartTour = () => {
    setRunTour(true);
    setShowTourButton(false);
  };

  const handleTourFinish = () => {
    setRunTour(false);
    setShowTourButton(true);
  };

  return (
    <MainLayout>
      {/* Guided Tour - Only render on client */}
      {isMounted && <GuidedTour run={runTour} onFinish={handleTourFinish} steps={tasksTourSteps} />}

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

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="tasks-header text-center">
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

       

        {/* Upcoming Plans Section */}
        <Card 
          className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/upcoming')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-semibold text-indigo-900">Upcoming Plans</h3>
                  <p className="text-xs text-indigo-700">View and manage your weekly plans</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* Submit Previous Day Log Section */}
        {<Card 
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push('/previous-log')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-900">Submit Yesterday&apos;s Log</h3>
                  <p className="text-xs text-orange-700">Submit missed logs before 6:00 PM</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>}

        {/* Today's Tasks Form */}
        <div className="weekly-activities space-y-2">
          <h3 className="font-semibold text-gray-900">📋 Submit Daily Logs</h3>
          
          {noPlanError && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="text-4xl mb-2">📅</div>
                <h3 className="font-semibold text-yellow-900 mb-2">No Active Weekly Plan</h3>
                <p className="text-sm text-yellow-700 mb-3">{noPlanError}</p>
                
              </CardContent>
            </Card>
          )}
          
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

          {!noPlanError && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {weeklyPlan?.activities.map((activity) => {
              const activityData = typeof activity === 'object' 
                ? activity 
                : null;
              const activityId = activityData?.activity || '';
              
              return (
                <Card key={activityId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {activityData?.label === 'Steps' && '👣'}
                          {activityData?.label === 'Sleep' && '😴'}
                          {activityData?.label === 'Water' && '💧'}
                          {activityData?.label === 'Yoga' && '🧘'}
                          {activityData?.label === 'Gym' && '🏋️'}
                          {activityData?.label === 'Floors' && '🏢'}
                          {!['Steps', 'Sleep', 'Water', 'Yoga', 'Gym', 'Floors'].includes(activityData?.label || '') && '✅'}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{activityData?.label}</p>
                          <p className="text-xs text-gray-600">
                            Target: {activity.targetValue} {activityData?.unit}
                            {activity.cadence === 'daily' ? '/day' : '/week'}
                          </p>
                        </div>
                      </div>
                      {/* <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        High
                      </span> */}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isAfter6PM ? (
                        <>
                          {activity.cadence === 'weekly' && activityData?.unit.toLowerCase() === 'days' ? (
                            <>
                              <div className="flex-1 flex items-center gap-2 bg-orange-50 p-3 rounded-md border border-orange-200 opacity-60">
                                <input
                                  type="checkbox"
                                  disabled
                                  checked={false}
                                  className="w-5 h-5 cursor-not-allowed"
                                />
                                <span className="text-sm text-orange-700">Available after 6 PM</span>
                                <Lock className="w-4 h-4 text-orange-500 ml-auto" />
                              </div>
                              <div className="flex items-center gap-1 text-xs text-orange-600 min-w-20">
                                <Timer className="w-4 h-4" />
                                <span className="font-mono">{timeUntilMidnight}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 relative">
                                <Input
                                  type="number"
                                  disabled
                                  value=""
                                  placeholder="Available after 6 PM"
                                  className="flex-1 bg-orange-50 border-orange-200 cursor-not-allowed opacity-60 placeholder:text-orange-700"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <Lock className="w-5 h-5 text-orange-500" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-orange-600 min-w-20">
                                <Timer className="w-4 h-4" />
                                <span className="font-mono">{timeUntilMidnight}</span>
                              </div>
                            </>
                          )}
                        </>
                      ) : activity.TodayLogged ? (
                        <>
                          {activity.cadence === 'weekly' && activityData?.unit.toLowerCase() === 'days' ? (
                            <>
                              <div className="flex-1 flex items-center gap-2 bg-gray-100 p-3 rounded-md opacity-60">
                                <input
                                  type="checkbox"
                                  disabled
                                  checked={checkboxActivities[activityId] || false}
                                  className="w-5 h-5 cursor-not-allowed"
                                />
                                <span className="text-sm text-gray-600">Done for today</span>
                                <Lock className="w-4 h-4 text-gray-500 ml-auto" />
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600 min-w-20">
                                <Timer className="w-4 h-4" />
                                <span className="font-mono">{timeUntilMidnight}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 relative">
                                <Input
                                  type="number"
                                  disabled
                                  max={activityData?.values.find(v=>v.tier===1)?.maxVal || 100000}
                                  value={activities[activityId] || 0}
                                  className="flex-1 bg-gray-100 cursor-not-allowed opacity-60"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <Lock className="w-5 h-5 text-gray-500" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-600 min-w-20">
                                <Timer className="w-4 h-4" />
                                <span className="font-mono">{timeUntilMidnight}</span>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {activity.cadence === 'weekly' && activityData?.unit.toLowerCase() === 'days' ? (
                            <>
                              <div className="flex-1 flex items-center gap-2 bg-blue-50 p-3 rounded-md border border-blue-200">
                                <input
                                  type="checkbox"
                                  checked={checkboxActivities[activityId] || false}
                                  onChange={(e) => handleCheckboxChange(activityId, e.target.checked)}
                                  className="w-5 h-5 cursor-pointer accent-blue-600"
                                />
                                <span className="text-sm text-gray-700">Done for today</span>
                              </div>
                              <span className="text-sm text-gray-600 min-w-20 text-right">
                                {(activity.pointsPerUnit!).toFixed(2)} pts/day
                              </span>
                            </>
                          ) : (
                            <>
                              <Input
                                type="number"
                                min={0}
                                max={activityData?.values.find(v=>v.tier===1)?.maxVal || 100000}
                                onBlur={(e) => {
                                  // Clamp value on blur
                                  let val = parseFloat(e.target.value) || 0;
                                  if (val < 0) val = 0;
                                  if (val > (activityData?.values.find(v=>v.tier===1)?.maxVal || 100000)) {
                                    val = activityData?.values.find(v=>v.tier===1)?.maxVal || 100000;
                                  }
                                  handleActivityChange(activityId, val.toString());
                                }}
                                step="any"
                                value={activities[activityId] || 0}
                                onChange={(e) => {
                                  // Allow free typing without clamping
                                  handleActivityChange(activityId, e.target.value);
                                }}
                                placeholder={`Enter ${activityData?.unit}`}
                                className="flex-1"
                              />
                              <span className="text-sm text-gray-600 min-w-20 text-right">
                                {activity.cadence=="daily"?`${activity.pointsPerUnit?.toFixed(2)} pts/Day`:`${(activity.pointsPerUnit!).toFixed(2)} pts/${activityData?.unit} (weekly)`}
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {!isAfter6PM && (
              <Card className="bg-orange-50 border-orange-200 mb-3">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">🕒</div>
                  <h3 className="font-semibold text-orange-900 mb-1">Log Submission Restricted</h3>
                  <p className="text-sm text-orange-700 mb-2">
                    Daily logs can only be submitted after 6:00 PM
                  </p>
                  <div className="flex items-center justify-center gap-2 text-orange-800">
                    <Timer className="w-5 h-5" />
                    <span className="font-mono font-semibold text-lg">{timeUntilMidnight}</span>
                    <span className="text-sm">until 6 PM</span>
                  </div>
                </CardContent>
              </Card>
            )}
            <Button
              type="submit"
              disabled={!isAfter6PM || loading||weeklyPlan?.activities.every(activity => activity.TodayLogged)||Object.values(activities).every(value => value === 0) && Object.values(checkboxActivities).every(checked => !checked)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : !isAfter6PM ? 'Available After 6 PM' : 'Submit Daily Log'}
            </Button>
          </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
}