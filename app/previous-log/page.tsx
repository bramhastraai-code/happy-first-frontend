'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type DailySummary, type SubmitPreviousDailyLogData } from '@/lib/api/dailyLog';
import { invalidateDashboardQueries } from '@/lib/queries/invalidateDashboard';
import { weeklyPlanAPI, type WeeklyPlan, type WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import CompactDatePicker from '@/components/ui/CompactDatePicker';
import TaskCategorySection from '@/components/tasks/TaskCategorySection';
import { Calendar, Clock, AlertCircle, Loader2, Eye } from 'lucide-react';
import { activityAPI, type Activity as ActivityType } from '@/lib/api/activity';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';
import { resolveActivityId } from '@/lib/utils/activityId';
import { canSubmitPartialLog, extractEarnedPoints, validateLogSubmit } from '@/lib/utils/logSubmit';
import LogSuccessOverlay from '@/components/ui/LogSuccessOverlay';

type PageMode = 'submit' | 'view' | 'closed' | 'loading';

const getActivityInputMax = (activity: WeeklyPlanActivity, activityData?: ActivityType) => {
  const configuredMax = activityData?.values.find((v) => v.tier === 1)?.maxVal;
  const baseMax = typeof configuredMax === 'number' ? configuredMax : 500000;
  const isWeeklyNumericTarget = activity.cadence === 'weekly' && activity.unit.toLowerCase() !== 'days';
  return isWeeklyNumericTarget ? Math.max(baseMax, baseMax * 7) : baseMax;
};

function toIsoDate(value?: string | null) {
  if (!value) return '';
  const dt = DateTime.fromISO(String(value).slice(0, 10), { zone: 'utc' });
  return dt.isValid ? dt.toISODate() || '' : '';
}

function isDateInActivePlan(dateIso: string, plan: WeeklyPlan | null, zone: string) {
  if (!plan || !dateIso) return false;
  const today = DateTime.now().setZone(zone).toISODate() || '';
  const weekStart = toIsoDate(plan.weekStart);
  const weekEnd = toIsoDate(plan.weekEnd);
  if (!weekStart || !weekEnd || !today) return false;
  return dateIso >= weekStart && dateIso <= weekEnd && dateIso < today;
}

export default function PreviousLogPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <LoadingScreen fullScreen label="Loading missed log…" />
        </MainLayout>
      }
    >
      <PreviousLogPageContent />
    </Suspense>
  );
}

function PreviousLogPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { accessToken, user, isHydrated, selectedProfile } = useAuthStore();
  const zone = selectedProfile?.timezone || 'local';

  const yesterday = useMemo(
    () => DateTime.now().setZone(zone).minus({ days: 1 }).toISODate() || '',
    [zone]
  );

  const [selectedDate, setSelectedDate] = useState('');
  const [activePlan, setActivePlan] = useState<WeeklyPlan | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [daySummary, setDaySummary] = useState<DailySummary | null>(null);
  const [activities, setActivities] = useState<Record<string, number>>({});
  const [checkboxActivities, setCheckboxActivities] = useState<Record<string, boolean>>({});
  const [pendingSliders, setPendingSliders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deadlineMessage, setDeadlineMessage] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [logAlreadyExists, setLogAlreadyExists] = useState(false);
  const [checkingLog, setCheckingLog] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningActivities, setWarningActivities] = useState<
    Array<{ label: string; value: number; target: number; percentage: number }>
  >([]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [actlist, setActlist] = useState<ActivityType[]>([]);

  const planMinDate = toIsoDate(activePlan?.weekStart);
  const planMaxDate = useMemo(() => {
    if (!activePlan) return yesterday;
    const weekEnd = toIsoDate(activePlan.weekEnd);
    if (!weekEnd) return yesterday;
    return weekEnd < yesterday ? weekEnd : yesterday;
  }, [activePlan, yesterday]);

  const dateInActivePlan = isDateInActivePlan(selectedDate, activePlan, zone);

  const extractErrorMessage = (err: unknown, fallback: string) => {
    if (
      typeof err === 'object' &&
      err !== null &&
      'response' in err &&
      typeof (err as { response?: unknown }).response === 'object' &&
      (err as { response?: unknown }).response !== null
    ) {
      const response = (err as { response?: { data?: { message?: string } } }).response;
      return response?.data?.message || fallback;
    }
    return fallback;
  };

  const mode: PageMode = useMemo(() => {
    if (!selectedDate || checkingLog || (loading && !activePlan && !daySummary)) return 'loading';
    if (logAlreadyExists && daySummary) return 'view';
    if (dateInActivePlan && weeklyPlan && !logAlreadyExists) return 'submit';
    return 'closed';
  }, [
    selectedDate,
    checkingLog,
    loading,
    activePlan,
    daySummary,
    logAlreadyExists,
    dateInActivePlan,
    weeklyPlan,
  ]);

  useEffect(() => {
    activityAPI
      .getList()
      .then((res) => setActlist(res.data.data))
      .catch((err) => console.error('Failed to load activities:', err));
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || !user) {
      router.push('/login');
    }
  }, [accessToken, user, router, isHydrated]);

  useEffect(() => {
    if (showCongrats) {
      const timer = setTimeout(() => router.push('/home?refresh=1'), 3000);
      return () => clearTimeout(timer);
    }
  }, [showCongrats, router]);

  // Load current active plan, then resolve selected date within its range.
  useEffect(() => {
    if (!selectedProfile || !isHydrated) return;

    const loadActivePlan = async () => {
      try {
        const plan = await weeklyPlanAPI.getCurrentPlan();
        setActivePlan(plan);

        const weekStart = toIsoDate(plan?.weekStart);
        const weekEnd = toIsoDate(plan?.weekEnd);
        const maxAllowed =
          weekEnd && weekEnd < yesterday ? weekEnd : yesterday;

        const requested = searchParams.get('date');
        let nextDate = yesterday;

        if (requested) {
          const parsed = DateTime.fromISO(requested, { zone });
          if (parsed.isValid) {
            const iso = parsed.toISODate() || '';
            if (weekStart && iso >= weekStart && iso <= maxAllowed) {
              nextDate = iso;
            } else if (iso < (weekStart || '') || (weekEnd && iso > weekEnd)) {
              // Outside active plan — still open for view if logged
              nextDate = iso;
            }
          }
        } else if (weekStart && yesterday < weekStart) {
          nextDate = '';
        }

        setSelectedDate(nextDate || maxAllowed || yesterday);
      } catch (err) {
        console.error('Failed to load active plan:', err);
        setActivePlan(null);
        setSelectedDate(yesterday);
      }
    };

    void loadActivePlan();
  }, [selectedProfile, isHydrated, searchParams, yesterday, zone]);

  useEffect(() => {
    if (!selectedDate) {
      setDeadlineMessage('Select a past date inside your active plan week.');
      return;
    }

    if (logAlreadyExists) {
      setDeadlineMessage('This day is already logged. Viewing your submitted entries.');
      return;
    }

    if (!activePlan) {
      setDeadlineMessage('No active plan found. Create a plan to submit missed logs.');
      return;
    }

    if (dateInActivePlan) {
      setDeadlineMessage('You can submit a missed log for this day in your active plan.');
      return;
    }

    setDeadlineMessage(
      'Only past dates inside your current active plan week can be submitted. Older weeks are blocked.'
    );
  }, [selectedDate, logAlreadyExists, activePlan, dateInActivePlan]);

  useEffect(() => {
    const checkLogAndFetchPlan = async () => {
      if (!selectedDate || !selectedProfile) return;

      try {
        setLoading(true);
        setCheckingLog(true);
        setError('');
        setLogAlreadyExists(false);
        setDaySummary(null);
        setWeeklyPlan(null);

        try {
          const summaryResponse = await dailyLogAPI.getSummary('daily', selectedDate);
          const summary = summaryResponse.data.data as DailySummary;
          setDaySummary(summary);

          if (summary?.isFullyLogged || summary?.isTodayLogged) {
            setLogAlreadyExists(true);
            setCheckingLog(false);
            setLoading(false);
            return;
          }
        } catch (err: unknown) {
          const response = (err as { response?: { status?: number; data?: { message?: string } } })
            ?.response;
          if (response?.status !== 404 && response?.data?.message !== 'No log found for this date') {
            console.error('Error checking existing log:', err);
          }
        }

        setCheckingLog(false);

        if (!isDateInActivePlan(selectedDate, activePlan, zone)) {
          setWeeklyPlan(null);
          return;
        }

        const response = await weeklyPlanAPI.getCurrent(selectedDate);
        if (response.data.data) {
          const plan = response.data.data;
          setWeeklyPlan(plan);

          const initialActivities: Record<string, number> = {};
          const initialCheckboxActivities: Record<string, boolean> = {};
          const initialPendingSliders: Record<string, boolean> = {};

          plan.activities.forEach((activity) => {
            const activityId = resolveActivityId(activity);
            if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
              initialCheckboxActivities[activityId] = false;
              initialPendingSliders[activityId] = true;
            } else {
              initialActivities[activityId] = 0;
            }
          });

          setActivities(initialActivities);
          setCheckboxActivities(initialCheckboxActivities);
          setPendingSliders(initialPendingSliders);
        } else {
          setWeeklyPlan(null);
          setError(response.data.message || 'No weekly plan found for the selected date');
        }
      } catch (err: unknown) {
        console.error('Error fetching weekly plan:', err);
        setError(extractErrorMessage(err, 'Failed to load weekly plan'));
      } finally {
        setLoading(false);
        setCheckingLog(false);
      }
    };

    void checkLogAndFetchPlan();
  }, [selectedDate, selectedProfile, activePlan, zone]);

  const handleActivityChange = (activityId: string, value: string) => {
    setActivities((prev) => ({ ...prev, [activityId]: parseFloat(value) || 0 }));
  };

  const handleCheckboxChange = (activityId: string, checked: boolean) => {
    setCheckboxActivities((prev) => ({ ...prev, [activityId]: checked }));
  };

  const handlePendingChange = (activityId: string, isPending: boolean) => {
    setPendingSliders((prev) => ({ ...prev, [activityId]: isPending }));
  };

  const handleSubmit = async () => {
    if (!dateInActivePlan) {
      setError('You can only submit missed logs for past days in your active plan week.');
      return;
    }
    if (!selectedProfile) {
      setError('No profile selected');
      return;
    }
    if (!weeklyPlan) {
      setError('No weekly plan found for the selected date.');
      return;
    }

    setError('');

    const warnings: Array<{ label: string; value: number; target: number; percentage: number }> =
      [];
    Object.entries(activities).forEach(([activityId, value]) => {
      if (value > 0) {
        const activity = weeklyPlan.activities.find((a) => resolveActivityId(a) === activityId);
        if (activity && activity.cadence !== 'weekly' && activity.label) {
          const targetValue = activity.targetValue;
          const percentage = (value / targetValue) * 100;
          if (percentage < 10 || percentage > 200) {
            warnings.push({
              label: activity.label,
              value,
              target: targetValue,
              percentage: Math.round(percentage),
            });
          }
        }
      }
    });

    if (warnings.length > 0 && !showWarning) {
      setWarningActivities(warnings);
      setShowWarning(true);
      return;
    }

    const validation = validateLogSubmit(weeklyPlan, activities, checkboxActivities, pendingSliders);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    try {
      const submitData: SubmitPreviousDailyLogData = {
        date: selectedDate,
        activities: validation.payload,
      };
      const response = await dailyLogAPI.submitPrevious(submitData);
      setEarnedPoints(extractEarnedPoints(response.data.data));
      await invalidateDashboardQueries(queryClient);
      setShowCongrats(true);
    } catch (err: unknown) {
      console.error('Error submitting previous log:', err);
      setError(extractErrorMessage(err, 'Failed to submit previous day log'));
    } finally {
      setLoading(false);
    }
  };

  const formattedSelectedDate = selectedDate
    ? DateTime.fromISO(selectedDate).toFormat('cccc, d LLL yyyy')
    : '';

  const handleConfirmSubmit = () => {
    setShowWarning(false);
    setWarningActivities([]);
    void handleSubmit();
  };

  const handleCancelSubmit = () => {
    setShowWarning(false);
    setWarningActivities([]);
  };

  if (!isMounted || !isHydrated) return null;

  const canSubmit = mode === 'submit';
  const showForm = mode === 'submit';
  const showView = mode === 'view' && daySummary;
  const pickerEnabled = Boolean(planMinDate && planMaxDate && planMinDate <= planMaxDate);

  return (
    <MainLayout>
      {showCongrats && (
        <LogSuccessOverlay
          points={earnedPoints}
          message="Your missed day log was saved successfully!"
        />
      )}

      <PageHeader
        title="Missed day log"
        subtitle="Enter past days from your active plan — or view if already saved"
        action={
          selectedDate ? (
            <span className="chip chip-active text-xs">
              {DateTime.fromISO(selectedDate).toFormat('d MMM')}
            </span>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <div className="section-card overflow-visible p-4">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Select date</h2>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {formattedSelectedDate || 'Pick a date in your active plan'}
              </p>
              {activePlan && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Active plan · {DateTime.fromISO(toIsoDate(activePlan.weekStart)).toFormat('d MMM')}
                  {' – '}
                  {DateTime.fromISO(toIsoDate(activePlan.weekEnd)).toFormat('d MMM')}
                </p>
              )}
            </div>
            {pickerEnabled && selectedDate && (
              <CompactDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                minDate={planMinDate}
                maxDate={planMaxDate}
              />
            )}
          </div>
        </div>

        <div
          className={cn(
            'app-card p-4',
            canSubmit
              ? 'border-primary/25 bg-primary-soft/50'
              : showView
                ? 'border-border bg-secondary/40'
                : 'border-amber-200 bg-amber-50'
          )}
        >
          <div className="flex items-start gap-3">
            {showView ? (
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Clock
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  canSubmit ? 'text-primary' : 'text-amber-600'
                )}
              />
            )}
            <div>
              <p
                className={cn(
                  'text-sm font-semibold',
                  canSubmit
                    ? 'text-accent-foreground'
                    : showView
                      ? 'text-foreground'
                      : 'text-amber-900'
                )}
              >
                {deadlineMessage}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Submit: past days in the active plan only. Already logged days are view-only.
              </p>
            </div>
          </div>
        </div>

        {(checkingLog || mode === 'loading') && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Checking log status…
          </div>
        )}

        {showView && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">Submitted log</h2>
              <span className="chip text-xs">{daySummary.totalPoints.toFixed(1)} pts</span>
            </div>
            <ul className="section-card divide-y divide-border">
              {daySummary.activities.map((activity) => (
                <li
                  key={String(activity.activityId)}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {activity.activity}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {activity.status} · target {activity.target} {activity.unit}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {activity.achieved} {activity.unit}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      +{activity.pointsEarned.toFixed(1)} pts
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showWarning && warningActivities.length > 0 && (
          <div className="app-card border-orange-200 bg-orange-50 p-5">
            <div className="mb-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Unusual values detected</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These entries look far from your targets. Review before submitting.
                </p>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              {warningActivities.map((warning, index) => (
                <div key={index} className="rounded-lg border border-orange-200 bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{warning.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Entered {warning.value} · Target {warning.target.toFixed(1)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-semibold',
                        warning.percentage < 10
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      )}
                    >
                      {warning.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={handleCancelSubmit} variant="outline" className="flex-1">
                Go back
              </Button>
              <Button type="button" onClick={handleConfirmSubmit} className="flex-1">
                Submit anyway
              </Button>
            </div>
          </div>
        )}

        {showForm && weeklyPlan && (
          <div className="space-y-4">
            <h2 className="section-title">Log activities</h2>
            {(['mind', 'body', 'soul'] as const).map((category) => (
              <TaskCategorySection
                key={category}
                category={category}
                activities={weeklyPlan.activities}
                actlist={actlist}
                isAfter6PM
                timeUntilMidnight=""
                activityValues={activities}
                checkboxActivities={checkboxActivities}
                pendingSliders={pendingSliders}
                onActivityChange={handleActivityChange}
                onCheckboxChange={handleCheckboxChange}
                onPendingChange={handlePendingChange}
                getActivityInputMax={getActivityInputMax}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {showForm && weeklyPlan && (
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              loading ||
              checkingLog ||
              !canSubmitPartialLog(weeklyPlan, activities, checkboxActivities, pendingSliders)
            }
            className="w-full py-5 text-base font-semibold"
          >
            {loading ? 'Submitting…' : checkingLog ? 'Checking…' : 'Submit missed log'}
          </Button>
        )}

        {mode === 'closed' && !checkingLog && (
          <div className="app-card p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">How missed logs work</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>Pick a past day inside your current active plan week</li>
                  <li>Enter activity values and submit</li>
                  <li>If already submitted, you can view the log here</li>
                  <li>Dates outside the active plan cannot be backfilled</li>
                </ul>
                {pickerEnabled && selectedDate !== planMaxDate && (
                  <Button
                    type="button"
                    className="mt-4"
                    variant="outline"
                    onClick={() => setSelectedDate(planMaxDate)}
                  >
                    Open latest allowed day
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
