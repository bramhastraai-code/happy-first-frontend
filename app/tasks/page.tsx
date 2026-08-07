'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type SubmitDailyLogData } from '@/lib/api/dailyLog';
import { invalidateDashboardQueries } from '@/lib/queries/invalidateDashboard';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { communityAPI, type MyCommunityActivity } from '@/lib/api/community';
import MainLayout from '@/components/layout/MainLayout';
import {
  AppPageHeader,
  headerActionBtnClass,
} from '@/components/ui/AppPageHeader';
import { Button } from '@/components/ui/button';
import TaskCategorySection from '@/components/tasks/TaskCategorySection';
import CommunityActivitiesSection from '@/components/tasks/CommunityActivitiesSection';
import { Calendar, ChevronRight, Timer, TrendingUp, CheckCircle2, AlertCircle, Pencil, RefreshCw, PlusCircle } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity, PlanChoiceState } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import GuidedTour from '@/components/ui/GuidedTour';
import TourStartButton from '@/components/ui/TourStartButton';
import { tasksTourSteps } from '@/lib/utils/tourSteps';
import { activityAPI, Activity as ActivityType } from '@/lib/api/activity';
import { DateTime } from 'luxon';
import { formatWeekRangeLabel, formatWeekRangeShort } from '@/lib/utils/weekDate';
import { resolveActivityId } from '@/lib/utils/activityId';
import { getActivityInputMax } from '@/lib/utils/activityInput';
import { canSubmitFullDayLog, extractEarnedPoints, validateLogSubmit } from '@/lib/utils/logSubmit';
import LogSuccessOverlay from '@/components/ui/LogSuccessOverlay';
import { firstNameFrom, getTimeGreeting } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

export default function TasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, user, isHydrated, sessionReady, selectedProfile } = useAuthStore();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [communityActivities, setCommunityActivities] = useState<MyCommunityActivity[]>([]);
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
  const [warningActivities, setWarningActivities] = useState<Array<{activityId: string; label: string; value: number; target: number; percentage: number}>>([]);
  const [hasUpcomingPlan, setHasUpcomingPlan] = useState(false);
  const [editPlanHref, setEditPlanHref] = useState('/create-plan');
  const [planChoice, setPlanChoice] = useState<PlanChoiceState | null>(null);

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
    // Wait for hydration + session restore before checking auth
    if (!isHydrated || !sessionReady) return;

    if (!accessToken || !user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [{ plan, planChoice: choice }, upcomingPlan, activityResponse, communityRes] =
          await Promise.all([
            weeklyPlanAPI.getCurrentPlanState(),
            weeklyPlanAPI.getUpcomingPlan(),
            activityAPI.getList(),
            communityAPI.myActivities().catch(() => null),
          ]);

        setPlanChoice(choice);
        setHasUpcomingPlan(Boolean(upcomingPlan));
        setActlist(activityResponse.data.data);

        // Never show an activity in both personal plan sections and Community Activities.
        const planActivityIdSet = new Set(
          (plan?.activities ?? [])
            .map((a: WeeklyPlanActivity) => resolveActivityId(a))
            .filter(Boolean)
        );
        const communityRows = (communityRes?.data?.data?.activities ?? []).filter(
          (row) => !planActivityIdSet.has(String(row.activityId))
        );
        setCommunityActivities(communityRows);

        // Prefer editing unconfirmed current-week plan on Monday; else upcoming; else create.
        if (choice?.canEditCurrent && choice.currentPlanId) {
          setEditPlanHref(`/create-plan?edit=${choice.currentPlanId}`);
        } else if (upcomingPlan?._id) {
          setEditPlanHref(`/create-plan?edit=${upcomingPlan._id}`);
        } else {
          setEditPlanHref('/create-plan');
        }

        if (!plan) {
          setWeeklyPlan(null);
          if (choice?.needsPlanChoice) {
            setNoPlanError('');
          } else {
            setNoPlanError('No active weekly plan found. Please create a weekly plan first to start logging your daily activities.');
          }
          // Still initialize community activity inputs when no plan
          const communityValues: Record<string, number> = {};
          const communityCheckbox: Record<string, boolean> = {};
          const communityPending: Record<string, boolean> = {};
          communityRows.forEach((row) => {
            if (row.cadence === 'weekly' && String(row.unit || '').toLowerCase() === 'days') {
              communityCheckbox[row.activityId] = false;
              communityPending[row.activityId] = true;
            } else {
              communityValues[row.activityId] = 0;
            }
          });
          setActivities(communityValues);
          setCheckboxActivities(communityCheckbox);
          setPendingSliders(communityPending);
          return;
        }

        setWeeklyPlan(plan);
        setNoPlanError('');

        // Initialize activity values
        const initialValues: Record<string, number> = {};
        const initialCheckboxValues: Record<string, boolean> = {};
        const initialPendingSliders: Record<string, boolean> = {};
        plan.activities.forEach((activity: WeeklyPlanActivity) => {
          const activityId = resolveActivityId(activity);
          
          // Check if it's a weekly activity with "days" unit
          if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
            initialCheckboxValues[activityId] = false;
            initialPendingSliders[activityId] = true;
          } else {
            initialValues[activityId] = 0;
          }
        });
        communityRows.forEach((row) => {
          if (row.cadence === 'weekly' && String(row.unit || '').toLowerCase() === 'days') {
            initialCheckboxValues[row.activityId] = false;
            initialPendingSliders[row.activityId] = true;
          } else {
            initialValues[row.activityId] = 0;
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
  }, [accessToken, user, router, isHydrated, sessionReady]);

  const handleRepeatPlan = () => {
    // Capture weight + weekly mood on create-plan before repeating
    router.push('/create-plan');
  };


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
        next6AM.setHours(6, 0, 0, 0);
        
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
    const warnings: Array<{activityId: string; label: string; value: number; target: number; percentage: number}> = [];
    
    Object.entries(activities).forEach(([activityId, value]) => {
      const activity = weeklyPlan?.activities.find(
        (a) => resolveActivityId(a) === activityId
      );
      if (!activity || activity.TodayLogged) return;

      if (activity.cadence !== 'weekly' && activity.label) {
        const targetValue = activity.targetValue;
        const percentage = targetValue > 0 ? (value / targetValue) * 100 : 0;
        
        if (percentage < 10 || percentage > 200) {
          warnings.push({
            activityId,
            label: activity.label,
            value,
            target: targetValue,
            percentage: Math.round(percentage),
          });
        }
      }
    });

    // If there are warnings and user hasn't confirmed yet, show warning banner
    if (warnings.length > 0 && !showWarning) {
      setWarningActivities(warnings);
      setShowWarning(true);
      return;
    }

    if (!weeklyPlan && communityActivities.length === 0) {
      setError('No weekly plan found.');
      return;
    }

    const personalValidation = weeklyPlan
      ? validateLogSubmit(weeklyPlan, activities, checkboxActivities, pendingSliders)
      : { ok: true as const, payload: [] as Array<{ activityId: string; value: number }> };

    if (weeklyPlan && !personalValidation.ok) {
      setError(personalValidation.error);
      return;
    }

    const communityPayload = communityActivities
      .filter((row) => !row.TodayLogged)
      .map((row) => {
        const isWeeklyDays =
          row.cadence === 'weekly' && String(row.unit || '').toLowerCase() === 'days';
        if (isWeeklyDays) {
          const isPending = pendingSliders[row.activityId] ?? true;
          if (isPending) return null;
          const value = checkboxActivities[row.activityId] ? 1 : 0;
          return { activityId: row.activityId, value, communityOnly: true as const };
        }
        const value = activities[row.activityId] ?? 0;
        // Community numeric: only include when user entered a value (optional vs personal full-day)
        return value > 0
          ? { activityId: row.activityId, value, communityOnly: true as const }
          : null;
      })
      .filter((entry): entry is { activityId: string; value: number; communityOnly: true } =>
        Boolean(entry)
      );

    const personalPayload = personalValidation.ok ? personalValidation.payload : [];

    if (personalPayload.length === 0 && communityPayload.length === 0) {
      setError('Please review all activities before submitting.');
      return;
    }

    // Proceed with submission
    setLoading(true);

    try {
      const submitData: SubmitDailyLogData = {
        activities: [...personalPayload, ...communityPayload],
      };

      const response = await dailyLogAPI.submit(submitData);
      const points = extractEarnedPoints(response.data.data);
      setEarnedPoints(points);

      await invalidateDashboardQueries(queryClient);
      
      if(response.status===201){
        const submittedById = new Map(
          submitData.activities.map((entry) => [entry.activityId, entry.value])
        );

        // Refetch plan so TodayLogged reflects server state for accurate partial vs complete UX
        let planForCompletion = weeklyPlan ? await weeklyPlanAPI.getCurrentPlan() : null;
        if (!planForCompletion && weeklyPlan) {
          planForCompletion = {
            ...weeklyPlan,
            activities: weeklyPlan.activities.map((activity) => {
              const activityId = resolveActivityId(activity);
              if (!submittedById.has(activityId)) return activity;
              return {
                ...activity,
                TodayLogged: true,
                achieved: submittedById.get(activityId) ?? activity.achieved,
              };
            }),
          };
        }
        if (planForCompletion) {
          setWeeklyPlan(planForCompletion);
        }

        setCommunityActivities((prev) =>
          prev.map((row) =>
            submittedById.has(row.activityId) ? { ...row, TodayLogged: true } : row
          )
        );

        setShowCongrats(true);

        // Reset only submitted fields; keep pending/skipped activities editable
        const submittedIds = new Set(submittedById.keys());
        const resetValues: Record<string, number> = { ...activities };
        const resetCheckboxValues: Record<string, boolean> = { ...checkboxActivities };
        const resetPendingSliders: Record<string, boolean> = { ...pendingSliders };

        planForCompletion?.activities.forEach((activity) => {
          const activityId = resolveActivityId(activity);
          if (!submittedIds.has(activityId)) return;

          if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
            resetCheckboxValues[activityId] = false;
            resetPendingSliders[activityId] = true;
          } else {
            resetValues[activityId] = 0;
          }
        });
        communityActivities.forEach((row) => {
          if (!submittedIds.has(row.activityId)) return;
          if (row.cadence === 'weekly' && String(row.unit || '').toLowerCase() === 'days') {
            resetCheckboxValues[row.activityId] = false;
            resetPendingSliders[row.activityId] = true;
          } else {
            resetValues[row.activityId] = 0;
          }
        });
        setActivities(resetValues);
        setCheckboxActivities(resetCheckboxValues);
        setPendingSliders(resetPendingSliders);
      }
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
      if (activity.TodayLogged) {
        completed += 1;
        return;
      }
      
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

  const scrollToActivityRow = (activityId: string) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`activity-row-${activityId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el?.querySelector('input');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    });
  };

  const handleCancelSubmit = () => {
    setShowWarning(false);
    const firstWarning = warningActivities[0];
    setWarningActivities([]);
    if (firstWarning?.activityId) {
      scrollToActivityRow(firstWarning.activityId);
    }
  };

  return (
    <MainLayout>
      {showCongrats && (
        <LogSuccessOverlay
          points={earnedPoints}
          message="You've successfully logged your activities!"
        />
      )}

      {/* Guided Tour - Only render on client */}
      {isMounted && <GuidedTour run={runTour} onFinish={handleTourFinish} steps={tasksTourSteps} />}

      {/* Tour Start Button - Only render on client */}
      {isMounted && showTourButton && (
        <TourStartButton onClick={handleStartTour} />
      )}

      <div className="tasks-header mb-6 flex flex-col gap-3">
        <AppPageHeader
          className="mb-0"
          title={
            <>
              {getTimeGreeting()},{' '}
              <span className="text-primary">
                {firstNameFrom(selectedProfile?.name || user?.name)}
              </span>
            </>
          }
          subtitle={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
          subtitleTone="label"
          meta={
            <span className="inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary sm:text-xs">
              Daily tasks
            </span>
          }
          actions={
            <button
              type="button"
              onClick={() => router.push(editPlanHref)}
              className={cn(headerActionBtnClass, 'hidden sm:inline-flex sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2')}
              aria-label={
                planChoice?.canEditCurrent
                  ? "Edit this week's plan"
                  : planChoice?.needsPlanChoice
                    ? "Create this week's plan"
                    : hasUpcomingPlan
                      ? 'Edit upcoming plan'
                      : 'Create upcoming plan'
              }
              title={
                planChoice?.canEditCurrent
                  ? "Edit this week's plan"
                  : planChoice?.needsPlanChoice
                    ? "Create this week's plan"
                    : hasUpcomingPlan
                      ? 'Edit upcoming plan'
                      : 'Create upcoming plan'
              }
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden text-xs font-medium lg:inline">
                {planChoice?.canEditCurrent
                  ? 'Edit plan'
                  : planChoice?.needsPlanChoice
                    ? 'Create plan'
                    : hasUpcomingPlan
                      ? 'Edit upcoming'
                      : 'Create plan'}
              </span>
            </button>
          }
        />
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full shrink-0 gap-1.5 sm:hidden"
            onClick={() => router.push(editPlanHref)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {planChoice?.canEditCurrent
              ? "Edit this week's plan"
              : planChoice?.needsPlanChoice
                ? "Create this week's plan"
                : hasUpcomingPlan
                  ? 'Edit upcoming plan'
                  : 'Create upcoming plan'}
          </Button>
          {weeklyPlan && (
            <div
              className="chip chip-active flex w-full items-center justify-center px-4 py-2.5 text-sm font-semibold"
              title={formatWeekRangeLabel(weeklyPlan.weekStart, weeklyPlan.weekEnd)}
            >
              Week · {formatWeekRangeShort(weeklyPlan.weekStart, weeklyPlan.weekEnd)}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {planChoice?.needsPlanChoice && (
          <div className="section-card space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Confirm this week&apos;s plan</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select the activities you want to log for this week.
              </p>
            </div>
            {success && (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{success}</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {planChoice.canRepeat && (
                <button
                  type="button"
                  onClick={handleRepeatPlan}
                  className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="inline-flex rounded-xl bg-secondary p-2.5 text-foreground">
                    <RefreshCw className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">Repeat last plan</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Same activities as last week (80%+ unlock).
                  </p>
                </button>
              )}
              {planChoice.canEditCurrent && (
                <button
                  type="button"
                  onClick={() => router.push(editPlanHref)}
                  className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-accent/40"
                >
                  <span className="inline-flex rounded-xl bg-primary-soft p-2.5 text-primary">
                    <Pencil className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">Edit plan</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edit this week&apos;s activities.
                  </p>
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push('/create-plan?fresh=1')}
                className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-accent/40"
              >
                <span className="inline-flex rounded-xl bg-primary-soft p-2.5 text-primary">
                  <PlusCircle className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">Create fresh plan</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick new activities from what&apos;s unlocked for you.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* After accidental repeat/create on Monday: still allow edit before first log */}
        {!planChoice?.needsPlanChoice && planChoice?.canEditCurrent && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Change this week&apos;s plan?</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                You can still edit activities until you enter your first log today.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => router.push(editPlanHref)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit plan
            </Button>
          </div>
        )}

        {/* Today's Progress — only after the week plan is confirmed */}
        {!planChoice?.needsPlanChoice && (
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
        )}

        {!planChoice?.needsPlanChoice && (hasUpcomingPlan || !noPlanError) && (
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
                    <p className="text-xs text-muted-foreground">View or edit next week&apos;s plan</p>
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
                      Submit missed log
                    </p>
                    <p className="text-xs text-muted-foreground">Any past day</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Today's Tasks Form */}
        {!planChoice?.needsPlanChoice && (
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

          {!isProfilePaused && (weeklyPlan || communityActivities.length > 0) && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {weeklyPlan
                ? (['mind', 'body', 'soul'] as const).map((category) => (
                    <TaskCategorySection
                      key={category}
                      category={category}
                      activities={weeklyPlan.activities ?? []}
                      actlist={actlist}
                      isAfter6PM={isAfter6PM}
                      timeUntilMidnight={timeUntilMidnight}
                      activityValues={activities}
                      checkboxActivities={checkboxActivities}
                      pendingSliders={pendingSliders}
                      onActivityChange={handleActivityChange}
                      onCheckboxChange={handleCheckboxChange}
                      onPendingChange={handlePendingChange}
                      getActivityInputMax={getActivityInputMax}
                    />
                  ))
                : null}

              <CommunityActivitiesSection
                activities={communityActivities}
                actlist={actlist}
                isAfter6PM={isAfter6PM}
                timeUntilMidnight={timeUntilMidnight}
                activityValues={activities}
                checkboxActivities={checkboxActivities}
                pendingSliders={pendingSliders}
                onActivityChange={handleActivityChange}
                onCheckboxChange={handleCheckboxChange}
                onPendingChange={handlePendingChange}
                getActivityInputMax={getActivityInputMax}
              />

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
              disabled={
                !isAfter6PM ||
                loading ||
                (weeklyPlan
                  ? !canSubmitFullDayLog(weeklyPlan, activities, checkboxActivities, pendingSliders)
                  : communityActivities.length === 0 ||
                    !communityActivities.some((row) => {
                      if (row.TodayLogged) return false;
                      const isWeeklyDays =
                        row.cadence === 'weekly' &&
                        String(row.unit || '').toLowerCase() === 'days';
                      if (isWeeklyDays) {
                        return !(pendingSliders[row.activityId] ?? true);
                      }
                      return true;
                    }))
              }
              className="submit-log-button w-full py-5 text-base font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </span>
              ) : !isAfter6PM ? 'Available After 6 PM' : 'Submit Daily Log'}
            </Button>
          </form>
          )}

        </div>
        )}
      </div>
    </MainLayout>
  );
}