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
import { Activity, Calendar, ChevronRight, Lock, Timer, Clock, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import GuidedTour from '@/components/ui/GuidedTour';
import { tasksTourSteps } from '@/lib/utils/tourSteps';
import { HelpCircle } from 'lucide-react';
import CustomSlider from '@/components/ui/CustomSlider';
import CustomNumericInput from '@/components/ui/CustomNumericInput';
import { activityAPI, Activity as ActivityType } from '@/lib/api/activity';

export default function TasksPage() {
  const router = useRouter();
  const { accessToken, user, isHydrated } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [activities, setActivities] = useState<Record<string, number>>({});
  const [checkboxActivities, setCheckboxActivities] = useState<Record<string, boolean>>({});
  const [pendingSliders, setPendingSliders] = useState<Record<string, boolean>>({});
  const [actlist,setActlist] =useState<ActivityType[]>([]);

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
        const [planResponse, activityResponse] = await Promise.all([
          weeklyPlanAPI.getCurrent(),
          activityAPI.getList()
        ]);
        
        setWeeklyPlan(planResponse.data.data);
        setActlist(activityResponse.data.data);
        setNoPlanError('');
        
        // Initialize activity values
        const initialValues: Record<string, number> = {};
        const initialCheckboxValues: Record<string, boolean> = {};
        const initialPendingSliders: Record<string, boolean> = {};
        planResponse.data.data.activities.forEach((activity: WeeklyPlanActivity) => {
          const activityId = typeof activity.activity === 'object' 
            ? activity.activity 
            : activity.activity;
          
          // Check if it's a weekly activity with "days" unit
          if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
            initialCheckboxValues[activityId] = false;
            initialPendingSliders[activityId] = true; // Start as pending
          } else {
            initialValues[activityId] = 0;
          }
        });
        setActivities(initialValues);
        setCheckboxActivities(initialCheckboxValues);
        setPendingSliders(initialPendingSliders);
        
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
        })).filter(entry => entry.value > 0 ); // Include only if checked or explicitly marked as not pending
      
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
      const resetPendingSliders: Record<string, boolean> = {};
      weeklyPlan?.activities.forEach((activity) => {
        const activityId = typeof activity.activity === 'object' 
          ? activity.activity 
          : activity.activity;
        
        if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
          resetCheckboxValues[activityId] = false;
          resetPendingSliders[activityId] = true;
        } else {
          resetValues[activityId] = 0;
        }
      });
      setActivities(resetValues);
      setCheckboxActivities(resetCheckboxValues);
      setPendingSliders(resetPendingSliders);
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

  const handlePendingChange = (activityId: string, isPending: boolean) => {
    setPendingSliders((prev) => ({ ...prev, [activityId]: isPending }));
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
        <div className="tasks-header">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Daily Tasks</h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                Week {Math.ceil(new Date().getDate() / 7)}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Progress */}
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-slate-600" />
                  <h2 className="font-semibold text-slate-900 text-lg">Today&apos;s Progress</h2>
                </div>
                <div className="flex items-baseline gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-4xl text-slate-900">{progress.completed}</span>
                    <span className="text-slate-500 text-lg font-medium">/ {progress.total}</span>
                  </div>
                  <div className="px-2.5 py-1 bg-blue-50 rounded-lg">
                    <span className="text-blue-700 font-semibold text-sm">
                      {Math.round(progress.percentage)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${
                progress.percentage === 100 ? 'bg-green-100' : 
                progress.percentage >= 50 ? 'bg-blue-100' : 'bg-slate-100'
              }`}>
                {progress.percentage === 100 ? (
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                ) : (
                  <Activity className="w-7 h-7 text-blue-600" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress.percentage === 100 ? 'bg-green-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              {progress.percentage === 100 && (
                <p className="text-xs text-green-600 font-medium text-center">All tasks completed! 🎉</p>
              )}
            </div>
          </CardContent>
        </Card>

       

        {/* Upcoming Plans Section */}
        <Card 
          className="border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
          onClick={() => router.push('/upcoming')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Upcoming Plans</h3>
                  <p className="text-xs text-slate-500">View and manage your weekly plans</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>

        {/* Submit Previous Day Log Section */}
        {<Card 
          className="border-slate-200 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
          onClick={() => router.push('/previous-log')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Submit Yesterday&apos;s Log</h3>
                  <p className="text-xs text-slate-500">Submit missed logs before 6:00 PM</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
          </CardContent>
        </Card>}

        {/* Today's Tasks Form */}
        <div className="weekly-activities space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-1 rounded-full bg-blue-600"></div>
            <h3 className="font-semibold text-slate-900 text-lg">Submit Daily Logs</h3>
          </div>
          
          {noPlanError && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">No Active Weekly Plan</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{noPlanError}</p>
              </CardContent>
            </Card>
          )}
          
          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm border border-green-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!noPlanError && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {weeklyPlan?.activities.map((activity) => {
              const activityData = typeof activity === 'object' 
                ? activity 
                : null;
              const activityId = activityData?.activity || '';
              const isSurprise = activity?.isSurpriseActivity ||false;
              
              return (
                <Card key={activityId} className={`border transition-all ${
                  isSurprise 
                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 shadow-sm hover:shadow-md relative'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}>
                  {isSurprise && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 z-10">
                      ⭐ BONUS
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                          isSurprise ? 'bg-amber-100' : 'bg-slate-100'
                        }`}>
                          {isSurprise ? '🎁' : (
                            <>
                              {actlist.find((act)=>act._id==activityData?.activity)?.icon }
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm mb-0.5 ${
                            isSurprise ? 'text-amber-900' : 'text-slate-900'
                          }`}>
                            {activityData?.label}
                          </p>
                          <p className={`text-xs ${
                            isSurprise ? 'text-amber-700' : 'text-slate-500'
                          }`}>
                            Target: {activity.targetValue} {activityData?.unit}
                            {activity.cadence === 'daily' ? '/day' : '/week'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isAfter6PM ? (
                        <>
                          {activity.cadence === 'weekly' && activityData?.unit.toLowerCase() === 'days' ? (
                            <>
                              <CustomSlider
                                checked={false}
                                onChange={() => {}}
                                disabled={true}
                              />
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md min-w-24 justify-center">
                                <Timer className="w-3.5 h-3.5" />
                                <span className="font-mono font-medium">{timeUntilMidnight}</span>
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
                                  className="flex-1 bg-slate-50 border-slate-200 cursor-not-allowed opacity-70 placeholder:text-slate-500 text-slate-600"
                                />
                                <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
                                  <Lock className="w-4 h-4 mr-3 text-slate-400" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-md min-w-24 justify-center">
                                <Timer className="w-3.5 h-3.5" />
                                <span className="font-mono font-medium">{timeUntilMidnight}</span>
                              </div>
                            </>
                          )}
                        </>
                      ) : activity.TodayLogged ? (
                        <>
                          {activity.cadence === 'weekly' && activityData?.unit.toLowerCase() === 'days' ? (
                            <>
                              <CustomSlider
                                checked={checkboxActivities[activityId] || false}
                                onChange={() => {}}
                                disabled={true}
                              />
                              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md min-w-24 justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="font-medium">Logged</span>
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
                                  className="flex-1 bg-slate-50 border-slate-200 cursor-not-allowed opacity-70 text-slate-600"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md min-w-24 justify-center">
                                <span className="font-medium">Logged</span>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {activity.cadence === 'weekly' && activityData?.unit.toLowerCase() === 'days' ? (
                            <>
                              <CustomSlider
                                checked={checkboxActivities[activityId] || false}
                                onChange={(checked) => handleCheckboxChange(activityId, checked)}
                                onPendingChange={(isPending) => handlePendingChange(activityId, isPending)}
                                disabled={false}
                              />
                              <div className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md min-w-24 text-center">
                                <span className="font-semibold text-slate-900">{(activity.pointsPerUnit!).toFixed(1)}</span>
                                <span className="text-slate-500"> pts</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <CustomNumericInput
                                value={activities[activityId] || 0}
                                onChange={(val) => handleActivityChange(activityId, val.toString())}
                                min={0}
                                max={activityData?.values.find(v=>v.tier===1)?.maxVal || 100000}
                                placeholder={`Enter ${activityData?.unit}`}
                                unit={activityData?.unit || ''}
                                pointsPerUnit={activity.pointsPerUnit || 0}
                                cadence={activity.cadence}
                                disabled={false}
                              />
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
              <Card className="bg-amber-50 border-amber-200 mb-3">
                <CardContent className="p-5 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                    <Timer className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">Log Submission Restricted</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Daily logs can only be submitted after 6:00 PM
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-amber-200">
                    <span className="text-xs text-slate-500 font-medium">Time remaining:</span>
                    <span className="font-mono font-bold text-lg text-amber-700">{timeUntilMidnight}</span>
                  </div>
                </CardContent>
              </Card>
            )}
            <Button
              type="submit"
              disabled={!isAfter6PM || loading||weeklyPlan?.activities.every(activity => activity.TodayLogged)||Object.values(activities).every(value => value === 0) && Object.values(checkboxActivities).every(checked => !checked) || Object.values(pendingSliders).some(isPending => isPending)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:text-slate-500 transition-all py-6 font-semibold text-base shadow-sm hover:shadow"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </span>
              ) : !isAfter6PM ? 'Available After 6 PM' : Object.values(pendingSliders).some(isPending => isPending) ? 'Please Complete All Sliders' : 'Submit Daily Log'}
            </Button>
          </form>
          )}
        </div>
      </div>
    </MainLayout>
  );
}