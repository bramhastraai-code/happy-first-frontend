'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type CalendarDay, type DailySummary, type SubmitPreviousDailyLogData } from '@/lib/api/dailyLog';
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
import { getActivityInputMax } from '@/lib/utils/activityInput';
import { canSubmitFullDayLog, extractEarnedPoints, validateLogSubmit } from '@/lib/utils/logSubmit';
import LogSuccessOverlay from '@/components/ui/LogSuccessOverlay';

type PageMode = 'submit' | 'view' | 'closed' | 'loading';

function formatSubmittedValue(activity: DailySummary['activities'][number]) {
  const unit = String(activity.unit || '').toLowerCase();
  const isWeeklyDays = activity.cadance === 'weekly' && unit === 'days';
  if (isWeeklyDays) {
    return activity.achieved > 0 ? 'Done' : 'Not Done';
  }
  return `${activity.achieved} ${activity.unit}`;
}

function isPastDate(dateIso: string, zone: string) {
  if (!dateIso) return false;
  const today = DateTime.now().setZone(zone).toISODate() || '';
  if (!today) return false;
  return dateIso < today;
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
    Array<{ activityId: string; label: string; value: number; target: number; percentage: number }>
  >([]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [actlist, setActlist] = useState<ActivityType[]>([]);
  const [pickerCalendarDays, setPickerCalendarDays] = useState<CalendarDay[]>([]);

  const dateIsPast = isPastDate(selectedDate, zone);

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
    if (!selectedDate || checkingLog || (loading && !weeklyPlan && !daySummary)) return 'loading';
    if (logAlreadyExists && daySummary) return 'view';
    if (dateIsPast && weeklyPlan && !logAlreadyExists) return 'submit';
    return 'closed';
  }, [
    selectedDate,
    checkingLog,
    loading,
    weeklyPlan,
    daySummary,
    logAlreadyExists,
    dateIsPast,
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

  // Resolve selected date — any past date is allowed.
  useEffect(() => {
    if (!selectedProfile || !isHydrated) return;

    const requested = searchParams.get('date');
    let nextDate = yesterday;

    if (requested) {
      const parsed = DateTime.fromISO(requested, { zone });
      if (parsed.isValid) {
        const iso = parsed.toISODate() || '';
        if (iso && isPastDate(iso, zone)) {
          nextDate = iso;
        }
      }
    }

    setSelectedDate(nextDate || yesterday);
  }, [selectedProfile, isHydrated, searchParams, yesterday, zone]);

  useEffect(() => {
    if (!selectedDate) {
      setDeadlineMessage('Select any past date to submit a missed log.');
      return;
    }

    const latestAllowedLabel = DateTime.fromISO(yesterday).toFormat('cccc, d LLL yyyy');

    if (logAlreadyExists) {
      setDeadlineMessage('This day is already logged. Viewing your submitted entries.');
      return;
    }

    if (dateIsPast) {
      setDeadlineMessage(`You can submit a missed log for this day. Latest day you can submit: ${latestAllowedLabel}.`);
      return;
    }

    setDeadlineMessage(
      `Latest day you can submit: ${latestAllowedLabel}. Today and future are blocked.`
    );
  }, [selectedDate, logAlreadyExists, dateIsPast, yesterday]);

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

        if (!isPastDate(selectedDate, zone)) {
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
  }, [selectedDate, selectedProfile, zone]);

  useEffect(() => {
    if (!selectedProfile?._id || !selectedDate) return;

    const parsed = DateTime.fromISO(selectedDate);
    if (!parsed.isValid) return;

    dailyLogAPI
      .getCalendar(selectedProfile._id, { month: parsed.month, year: parsed.year })
      .then((res) => setPickerCalendarDays(res.data.data.calendarDays ?? []))
      .catch(() => setPickerCalendarDays([]));
  }, [selectedProfile?._id, selectedDate]);

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
    if (!dateIsPast) {
      setError('You can only submit missed logs for past dates.');
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

    const warnings: Array<{ activityId: string; label: string; value: number; target: number; percentage: number }> =
      [];
    Object.entries(activities).forEach(([activityId, value]) => {
      const activity = weeklyPlan.activities.find((a) => resolveActivityId(a) === activityId);
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

  if (!isMounted || !isHydrated) return null;

  const canSubmit = mode === 'submit';
  const showForm = mode === 'submit';
  const showView = mode === 'view' && daySummary;
  const pickerEnabled = Boolean(yesterday);

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
        subtitle="Enter any past day — or view if already saved"
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
                {formattedSelectedDate || 'Pick any past date'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Latest day you can submit: {DateTime.fromISO(yesterday).toFormat('d MMM yyyy')}. Today and future are blocked.
              </p>
            </div>
            {pickerEnabled && selectedDate && (
              <CompactDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                maxDate={yesterday}
                calendarDays={pickerCalendarDays}
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
                Submit: any past day. Already logged days are view-only.
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
              <span className="chip text-xs">{daySummary.totalPoints.toFixed(1)}%</span>
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
                      {formatSubmittedValue(activity)}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      +{activity.pointsEarned.toFixed(1)}%
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
                Go back & edit
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
              !canSubmitFullDayLog(weeklyPlan, activities, checkboxActivities, pendingSliders)
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
                  <li>Pick any past day</li>
                  <li>Enter activity values and submit</li>
                  <li>If already submitted, you can view the log here</li>
                  <li>A weekly plan must exist for that date</li>
                </ul>
                {pickerEnabled && selectedDate !== yesterday && (
                  <Button
                    type="button"
                    className="mt-4"
                    variant="outline"
                    onClick={() => setSelectedDate(yesterday)}
                  >
                    Open yesterday
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
