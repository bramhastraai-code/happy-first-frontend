'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type SubmitDailyLogData } from '@/lib/api/dailyLog';
import { invalidateDashboardQueries } from '@/lib/queries/invalidateDashboard';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import TaskCategorySection from '@/components/tasks/TaskCategorySection';
import { Calendar, ChevronRight, Timer, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import GuidedTour from '@/components/ui/GuidedTour';
import TourStartButton from '@/components/ui/TourStartButton';
import { tasksTourSteps } from '@/lib/utils/tourSteps';
import { activityAPI, Activity as ActivityType } from '@/lib/api/activity';
import { DateTime } from 'luxon';
import { formatWeekRangeLabel, formatWeekRangeShort } from '@/lib/utils/weekDate';

export default function TasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, user, isHydrated, selectedProfile } = useAuthStore();
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
  const [showCongrats, setShowCongrats] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningActivities, setWarningActivities] = useState<Array<{label: string, value: number, target: number, percentage: number}>>([]);
  const [hasUpcomingPlan, setHasUpcomingPlan] = useState(false);

  const getActivityInputMax = (activity: WeeklyPlanActivity, activityData?: ActivityType) => {
    const configuredMax = activityData?.values.find((v) => v.tier === 1)?.maxVal;
    const baseMax = typeof configuredMax === 'number' ? configuredMax : 500000;
    const isWeeklyNumericTarget = activity.cadence === 'weekly' && activity.unit.toLowerCase() !== 'days';
    return isWeeklyNumericTarget ? Math.max(baseMax, baseMax * 7) : baseMax;
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to home after showing congrats (dashboard refetches fresh score + streak)
  useEffect(() => {
    if (showCongrats) {
      const timer = setTimeout(() => {
        router.push('/home?refresh=1');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showCongrats, router]);

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
        const [plan, upcomingPlan, activityResponse] = await Promise.all([
          weeklyPlanAPI.getCurrentPlan(),
          weeklyPlanAPI.getUpcomingPlan(),
          activityAPI.getList(),
        ]);

        setHasUpcomingPlan(Boolean(upcomingPlan));
        setActlist(activityResponse.data.data);

        if (!plan) {
          setWeeklyPlan(null);
          setNoPlanError('No active weekly plan found. Please create a weekly plan first to start logging your daily activities.');
          return;
        }

        setWeeklyPlan(plan);
        setNoPlanError('');

        // Initialize activity values
        const initialValues: Record<string, number> = {};
        const initialCheckboxValues: Record<string, boolean> = {};
        const initialPendingSliders: Record<string, boolean> = {};
        plan.activities.forEach((activity: WeeklyPlanActivity) => {
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
        setNoPlanError('Failed to load your weekly plan. Please refresh and try again.');
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
    setError('');
    setSuccess('');

    // Validate activities for warnings
    const warnings: Array<{label: string, value: number, target: number, percentage: number}> = [];
    
    Object.entries(activities).forEach(([activityId, value]) => {
      if (value > 0) {
        const activity = weeklyPlan?.activities.find(a => a.activity === activityId);
        if (activity && activity.cadence !== 'weekly' && activity.label) {
          const targetValue =  activity.targetValue ;
          const percentage = (value / targetValue) * 100;
          
          if (percentage < 10 || percentage > 200) {
            warnings.push({
              label: activity.label,
              value,
              target: targetValue,
              percentage: Math.round(percentage)
            });
          }
        }
      }
    });

    // If there are warnings and user hasn't confirmed yet, show warning banner
    if (warnings.length > 0 && !showWarning) {
      setWarningActivities(warnings);
      setShowWarning(true);
      return;
    }

    // Proceed with submission
    setLoading(true);

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
      setEarnedPoints(response.data.data.totalPoints);
      setShowCongrats(true);

      await invalidateDashboardQueries(queryClient);
      
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
  const isProfilePaused = Boolean(selectedProfile?.pause ?? selectedProfile?.setting?.pause);

  const handleStartTour = () => {
    setRunTour(true);
    setShowTourButton(false);
  };

  const handleTourFinish = () => {
    setRunTour(false);
    setShowTourButton(true);
  };

  const handleConfirmSubmit = () => {
    setShowWarning(false);
    setWarningActivities([]);
    // Trigger form submission programmatically
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  const handleCancelSubmit = () => {
    setShowWarning(false);
    setWarningActivities([]);
  };

  return (
    <MainLayout>
      {/* Congratulations Screen */}
      {showCongrats && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center animate-fade-in">
          <div className="text-center px-6 animate-scale-up">
            {/* Trophy Icon */}
            <div className="mb-6 animate-bounce">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-full shadow-2xl">
                <span className="text-7xl">🏆</span>
              </div>
            </div>
            
            {/* Congratulations Text */}
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
              Congratulations!
            </h1>
            <p className="text-2xl text-white/90 mb-6">
              You&apos;ve successfully logged your activities!
            </p>
            
            {/* Points Card */}
            <div className="inline-block bg-white rounded-2xl shadow-2xl px-8 py-6 mb-8">
              <p className="text-sm text-slate-600 font-medium mb-2">Points Earned</p>
              <p className="text-5xl font-bold text-green-600">
                +{earnedPoints.toFixed(2)}
              </p>
            </div>
            
            {/* Confetti/Stars */}
            <div className="flex justify-center gap-4 text-4xl mb-6 animate-pulse">
              <span>⭐</span>
              <span>🎉</span>
              <span>✨</span>
              <span>🎊</span>
              <span>⭐</span>
            </div>
            
            {/* Redirecting message */}
            <p className="text-white/80 text-sm">
              Redirecting to home...
            </p>
          </div>
        </div>
      )}

      {/* Guided Tour - Only render on client */}
      {isMounted && <GuidedTour run={runTour} onFinish={handleTourFinish} steps={tasksTourSteps} />}

      {/* Tour Start Button - Only render on client */}
      {isMounted && showTourButton && (
        <TourStartButton onClick={handleStartTour} />
      )}

      <div className="tasks-header mb-6 space-y-3">
      <PageHeader
        className="mb-0"
        title="Daily tasks"
        subtitle={new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      />
      {weeklyPlan && (
        <div
          className="chip chip-active flex w-full items-center justify-center px-4 py-2.5 text-sm font-semibold"
          title={formatWeekRangeLabel(weeklyPlan.weekStart, weeklyPlan.weekEnd)}
        >
          Week · {formatWeekRangeShort(weeklyPlan.weekStart, weeklyPlan.weekEnd)}
        </div>
      )}
      </div>

      <div className="space-y-4">
        {/* Today's Progress */}
        <div className="tasks-progress overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-soft/60 via-surface to-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Today&apos;s progress</h2>
                  <p className="text-xs text-muted-foreground">Activities logged today</p>
                </div>
              </div>

              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-bold leading-none tabular-nums tracking-tight text-foreground">
                  {progress.completed}
                </span>
                <span className="pb-1 text-lg font-medium text-muted-foreground">/ {progress.total}</span>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {progress.total === 0
                  ? 'No tasks in your plan today'
                  : progress.completed === progress.total
                    ? 'Great work — you logged everything'
                    : `${progress.total - progress.completed} task${progress.total - progress.completed === 1 ? '' : 's'} left to log`}
              </p>
            </div>

            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(${
                  progress.percentage === 100 ? 'var(--color-success)' : 'var(--color-primary)'
                } ${progress.percentage * 3.6}deg, var(--color-secondary) 0deg)`,
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-sm">
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {Math.round(progress.percentage)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Completion</span>
              <span className={progress.percentage === 100 ? 'text-success' : 'text-primary'}>
                {progress.completed} of {progress.total}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.percentage === 100 ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {progress.percentage === 100 && (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-success-soft px-3 py-2 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All tasks completed
            </div>
          )}
        </div>

        {(hasUpcomingPlan || !noPlanError) && (
          <div className="tasks-quick-links section-card divide-y divide-border">
            {hasUpcomingPlan && (
              <button
                type="button"
                onClick={() => router.push('/upcoming')}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-xl bg-primary-soft p-2 text-primary">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upcoming plan</p>
                    <p className="text-xs text-muted-foreground">View your locked plan for next week</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}

            {!noPlanError && (
              <button
                type="button"
                onClick={() => router.push('/previous-log')}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex rounded-xl bg-secondary p-2 text-accent-foreground">
                    <Timer className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Submit yesterday&apos;s log ({DateTime.now().minus({ day: 1 }).toFormat('dd MMM')})
                    </p>
                    <p className="text-xs text-muted-foreground">Submit missed logs before 12:00 PM</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Today's Tasks Form */}
        <div className="weekly-activities space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="section-title">Submit daily logs</h3>
            {!isAfter6PM && timeUntilMidnight && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">
                <Timer className="h-3 w-3" />
                <span className="font-mono">{timeUntilMidnight}</span>
              </span>
            )}
          </div>

          {isProfilePaused && (
            <div className="app-card border-amber-200 bg-amber-50 p-5 text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Timer className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">You are paused</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your service is currently paused. Resume from Settings to continue submitting daily logs.
              </p>
            </div>
          )}

          {!noPlanError && !isProfilePaused && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {(['mind', 'body', 'soul'] as const).map((category) => (
                <TaskCategorySection
                  key={category}
                  category={category}
                  activities={weeklyPlan?.activities ?? []}
                  actlist={actlist}
                  isAfter6PM={isAfter6PM}
                  timeUntilMidnight={timeUntilMidnight}
                  activityValues={activities}
                  checkboxActivities={checkboxActivities}
                  onActivityChange={handleActivityChange}
                  onCheckboxChange={handleCheckboxChange}
                  onPendingChange={handlePendingChange}
                  getActivityInputMax={getActivityInputMax}
                />
              ))}


            {/* Warning Banner for Unusual Values */}
            {showWarning && warningActivities.length > 0 && (
              <div className="app-card mb-3 border-orange-200 bg-orange-50 p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">Unusual values detected</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        The following activities have values that seem unusually low or high compared to your targets:
                      </p>
                      <div className="space-y-2 mb-4">
                        {warningActivities.map((warning, index) => (
                          <div key={index} className="rounded-lg border border-orange-200 bg-surface p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm text-foreground">{warning.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  Entered: {warning.value} | Target: {warning.target.toFixed(1)}
                                </p>
                              </div>
                              <div className={`px-2.5 py-1 rounded-lg font-semibold text-sm ${
                                warning.percentage < 10 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {warning.percentage}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleCancelSubmit}
                          variant="outline"
                          className="flex-1"
                        >
                          Go back & edit
                        </Button>
                        <Button
                          type="button"
                          onClick={handleConfirmSubmit}
                          className="flex-1"
                        >
                          Submit anyway
                        </Button>
                      </div>
                    </div>
                  </div>
              </div>
            )}

            {!isAfter6PM && (
              <div className="app-card mb-3 border-amber-200 bg-amber-50 p-5 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                    <Timer className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Log submission restricted</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Daily logs can only be submitted after 6:00 PM
                  </p>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-surface px-4 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Time remaining:</span>
                    <span className="font-mono text-lg font-bold text-accent-foreground">{timeUntilMidnight}</span>
                  </div>
              </div>
            )}
            {noPlanError && (
            <div className="app-card border-amber-200 bg-amber-50 p-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-3">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No active weekly plan</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{noPlanError}</p>
            </div>
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
            <Button
              type="submit"
              disabled={!isAfter6PM || loading||weeklyPlan?.activities.every(activity => activity.TodayLogged)||Object.values(activities).every(value => value === 0) && Object.values(checkboxActivities).every(checked => !checked) || Object.values(pendingSliders).some(isPending => isPending)}
              className="submit-log-button w-full py-5 text-base font-semibold"
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