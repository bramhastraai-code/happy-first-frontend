'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type CalendarDay, type DailySummary, type SubmitDailyLogData } from '@/lib/api/dailyLog';
import { invalidateDashboardQueries } from '@/lib/queries/invalidateDashboard';
import { weeklyPlanAPI, type WeeklyPlan } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import CompactDatePicker from '@/components/ui/CompactDatePicker';
import TaskCategorySection from '@/components/tasks/TaskCategorySection';
import CommunityActivitiesSection from '@/components/tasks/CommunityActivitiesSection';
import { AlertCircle, Loader2 } from 'lucide-react';
import { activityAPI, type Activity as ActivityType } from '@/lib/api/activity';
import { communityAPI, type MyCommunityActivity } from '@/lib/api/community';
import { DateTime } from 'luxon';
import { resolveActivityId } from '@/lib/utils/activityId';
import { getActivityInputMax } from '@/lib/utils/activityInput';
import {
  formatDailySummaryActivityProgress,
} from '@/lib/utils/activityProgress';
import {
  applyDaySummaryToPlan,
  canSubmitFullDayLog,
  collectUnusualValueWarnings,
  extractEarnedPoints,
  formatLoggedActivityValue,
  validateLogSubmit,
  type LogSuccessEntry,
} from '@/lib/utils/logSubmit';
import LogSuccessOverlay from '@/components/ui/LogSuccessOverlay';

type PageMode = 'submit' | 'view' | 'closed' | 'loading';

function formatSubmittedValue(activity: DailySummary['activities'][number]) {
  return formatDailySummaryActivityProgress(activity).text;
}

function isLoggableDate(dateIso: string, zone: string) {
  if (!dateIso) return false;
  const today = DateTime.now().setZone(zone).toISODate() || '';
  if (!today) return false;
  return dateIso <= today;
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
  const { accessToken, user, isHydrated, sessionReady, selectedProfile } = useAuthStore();
  const zone = selectedProfile?.timezone || 'Asia/Kolkata';

  const yesterday = useMemo(
    () => DateTime.now().setZone(zone).minus({ days: 1 }).toISODate() || '',
    [zone]
  );
  const today = useMemo(
    () => DateTime.now().setZone(zone).toISODate() || '',
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
  const [loggedEntries, setLoggedEntries] = useState<LogSuccessEntry[]>([]);
  const [showCongrats, setShowCongrats] = useState(false);
  const [actlist, setActlist] = useState<ActivityType[]>([]);
  const [pickerCalendarDays, setPickerCalendarDays] = useState<CalendarDay[]>([]);
  const [communityActivities, setCommunityActivities] = useState<MyCommunityActivity[]>([]);

  const dateIsLoggable = isLoggableDate(selectedDate, zone);
  const selectedIsToday = Boolean(selectedDate && today && selectedDate === today);

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

  const hasCommunityToLog = communityActivities.some((row) => !row.TodayLogged);

  const mode: PageMode = useMemo(() => {
    if (!selectedDate || checkingLog || (loading && !weeklyPlan && !daySummary && !communityActivities.length))
      return 'loading';
    if (logAlreadyExists && daySummary && !hasCommunityToLog) return 'view';
    if (dateIsLoggable && (weeklyPlan || hasCommunityToLog) && !(logAlreadyExists && !hasCommunityToLog))
      return 'submit';
    if (logAlreadyExists && daySummary) return 'view';
    return 'closed';
  }, [
    selectedDate,
    checkingLog,
    loading,
    weeklyPlan,
    daySummary,
    communityActivities.length,
    logAlreadyExists,
    dateIsLoggable,
    hasCommunityToLog,
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
    if (!isHydrated || !sessionReady) return;
    if (!accessToken || !user) {
      router.push('/login');
    }
  }, [accessToken, user, router, isHydrated, sessionReady]);

  useEffect(() => {
    if (showCongrats) {
      const timer = setTimeout(() => router.push('/home?refresh=1'), 4500);
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
        if (iso && isLoggableDate(iso, zone)) {
          nextDate = iso;
        }
      }
    }

    setSelectedDate(nextDate || yesterday);
  }, [selectedProfile, isHydrated, searchParams, yesterday, zone]);

  useEffect(() => {
    if (!selectedDate) {
      setDeadlineMessage('Pick a date');
      return;
    }

    if (logAlreadyExists && !hasCommunityToLog) {
      setDeadlineMessage('Already logged');
      return;
    }

    if (logAlreadyExists && hasCommunityToLog) {
      setDeadlineMessage('Finish community activities');
      return;
    }

    const hasPartialLogs = Boolean(
      weeklyPlan?.activities?.some((activity) => activity.TodayLogged)
    );

    if (dateIsLoggable) {
      if (hasPartialLogs) {
        setDeadlineMessage('Finish remaining activities');
        return;
      }
      setDeadlineMessage(selectedIsToday ? 'Ready to log' : 'Missed day');
      return;
    }

    setDeadlineMessage('Future date');
  }, [
    selectedDate,
    logAlreadyExists,
    dateIsLoggable,
    selectedIsToday,
    weeklyPlan,
    hasCommunityToLog,
  ]);

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
        setCommunityActivities([]);

        let summary: DailySummary | null = null;
        try {
          const summaryResponse = await dailyLogAPI.getSummary('daily', selectedDate);
          summary = summaryResponse.data.data as DailySummary;
          setDaySummary(summary);

          if (summary?.isFullyLogged) {
            setLogAlreadyExists(true);
          }
        } catch (err: unknown) {
          const response = (err as { response?: { status?: number; data?: { message?: string } } })
            ?.response;
          if (response?.status !== 404 && response?.data?.message !== 'No log found for this date') {
            console.error('Error checking existing log:', err);
          }
        }

        let communityRows: MyCommunityActivity[] = [];
        try {
          const communityRes = await communityAPI.myActivities({ date: selectedDate });
          communityRows = communityRes.data.data.activities ?? [];
          setCommunityActivities(communityRows);
        } catch (err) {
          console.error('Error loading community activities:', err);
          setCommunityActivities([]);
        }

        setCheckingLog(false);

        if (!dateIsLoggable) {
          setWeeklyPlan(null);
          return;
        }

        const communityInitialActivities: Record<string, number> = {};
        const communityInitialCheckbox: Record<string, boolean> = {};
        const communityInitialPending: Record<string, boolean> = {};
        communityRows.forEach((row) => {
          if (row.TodayLogged) return;
          const isWeeklyDays =
            row.cadence === 'weekly' && String(row.unit || '').toLowerCase() === 'days';
          if (isWeeklyDays) {
            communityInitialCheckbox[row.activityId] = false;
            communityInitialPending[row.activityId] = true;
          } else {
            communityInitialActivities[row.activityId] = 0;
          }
        });

        try {
          const response = await weeklyPlanAPI.getCurrent(selectedDate);
          if (response.data.data) {
            const plan = applyDaySummaryToPlan(response.data.data, summary);

            if (
              summary &&
              plan.activities.length > 0 &&
              plan.activities.every((activity) => activity.TodayLogged)
            ) {
              setLogAlreadyExists(true);
              setWeeklyPlan(null);
            } else {
              setWeeklyPlan(plan);

              const initialActivities: Record<string, number> = { ...communityInitialActivities };
              const initialCheckboxActivities: Record<string, boolean> = {
                ...communityInitialCheckbox,
              };
              const initialPendingSliders: Record<string, boolean> = {
                ...communityInitialPending,
              };

              plan.activities.forEach((activity) => {
                const activityId = resolveActivityId(activity);
                if (activity.TodayLogged) return;
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
              setLoading(false);
              setCheckingLog(false);
              return;
            }
          } else {
            setWeeklyPlan(null);
            if (!communityRows.some((r) => !r.TodayLogged)) {
              setError(response.data.message || 'No weekly plan found for the selected date');
            }
          }
        } catch (err: unknown) {
          console.error('Error fetching weekly plan:', err);
          if (!communityRows.some((r) => !r.TodayLogged)) {
            setError(extractErrorMessage(err, 'Failed to load weekly plan'));
          }
        }

        setActivities(communityInitialActivities);
        setCheckboxActivities(communityInitialCheckbox);
        setPendingSliders(communityInitialPending);
      } catch (err: unknown) {
        console.error('Error fetching weekly plan:', err);
        setError(extractErrorMessage(err, 'Failed to load weekly plan'));
      } finally {
        setLoading(false);
        setCheckingLog(false);
      }
    };

    void checkLogAndFetchPlan();
  }, [selectedDate, selectedProfile, zone, dateIsLoggable]);

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
    if (!dateIsLoggable) {
      setError('You can only submit logs for today or past dates.');
      return;
    }
    if (!selectedProfile) {
      setError('No profile selected');
      return;
    }
    if (!weeklyPlan && !hasCommunityToLog) {
      setError('No weekly plan or community activities found for the selected date.');
      return;
    }

    setError('');

    const warnings = weeklyPlan ? collectUnusualValueWarnings(weeklyPlan, activities) : [];

    if (warnings.length > 0 && !showWarning) {
      setWarningActivities(warnings);
      setShowWarning(true);
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

    setLoading(true);
    try {
      const submitData: SubmitDailyLogData = {
        activities: [...personalPayload, ...communityPayload],
      };
      const response = selectedIsToday
        ? await dailyLogAPI.submit(submitData)
        : await dailyLogAPI.submitPrevious({
            date: selectedDate,
            activities: submitData.activities,
          });
      setEarnedPoints(extractEarnedPoints(response.data.data));
      setLoggedEntries(
        submitData.activities.map((entry) => {
          const planAct = weeklyPlan?.activities.find(
            (activity) => resolveActivityId(activity) === entry.activityId
          );
          if (planAct) return formatLoggedActivityValue(planAct, entry.value);
          const communityAct = communityActivities.find((row) => row.activityId === entry.activityId);
          if (communityAct) return formatLoggedActivityValue(communityAct, entry.value);
          return { label: 'Activity', value: String(entry.value) };
        })
      );
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
    ? DateTime.fromISO(selectedDate).toFormat('ccc, d LLL')
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

  if (!isMounted || !isHydrated || !sessionReady) return null;

  const showForm = mode === 'submit';
  const showView = mode === 'view' && daySummary;
  const pickerEnabled = Boolean(today);

  return (
    <MainLayout>
      {showCongrats && (
        <LogSuccessOverlay
          points={earnedPoints}
          message="Missed day saved"
          entries={loggedEntries}
        />
      )}

      <PageHeader
        title="Missed log"
        action={
          pickerEnabled && selectedDate ? (
            <CompactDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              maxDate={today}
              calendarDays={pickerCalendarDays}
            />
          ) : undefined
        }
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {formattedSelectedDate || 'Pick a date'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{deadlineMessage}</p>
          </div>
          {showView ? (
            <span className="chip shrink-0 text-xs tabular-nums">
              {daySummary.totalPoints.toFixed(1)}%
            </span>
          ) : null}
        </div>

        {(checkingLog || mode === 'loading') && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading…
          </div>
        )}

        {showView && (
          <ul className="divide-y divide-border border-y border-border">
            {daySummary.activities.map((activity) => (
              <li
                key={String(activity.activityId)}
                className="flex items-center justify-between gap-3 py-3"
              >
                <p className="min-w-0 truncate text-sm font-medium text-foreground">
                  {activity.activity}
                </p>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {formatSubmittedValue(activity)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    +{activity.pointsEarned.toFixed(1)}%
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {showWarning && warningActivities.length > 0 && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-orange-600" />
              <h3 className="text-sm font-semibold text-foreground">Unusual values</h3>
            </div>
            <ul className="mb-3 space-y-1.5">
              {warningActivities.map((warning) => (
                <li
                  key={warning.activityId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate text-foreground">{warning.label}</span>
                  <span className="shrink-0 tabular-nums text-orange-700">
                    {warning.value}/{warning.target.toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button type="button" onClick={handleCancelSubmit} variant="outline" className="flex-1">
                Edit
              </Button>
              <Button type="button" onClick={handleConfirmSubmit} className="flex-1">
                Submit anyway
              </Button>
            </div>
          </div>
        )}

        {showForm && (weeklyPlan || hasCommunityToLog) && (
          <div className="space-y-1">
            {weeklyPlan
              ? (['body', 'mind', 'soul'] as const).map((category) => (
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
                ))
              : null}
            {hasCommunityToLog ? (
              <CommunityActivitiesSection
                activities={communityActivities.filter((row) => !row.TodayLogged)}
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
            ) : null}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {showForm && (weeklyPlan || hasCommunityToLog) && (
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              loading ||
              checkingLog ||
              (weeklyPlan
                ? !canSubmitFullDayLog(weeklyPlan, activities, checkboxActivities, pendingSliders) &&
                  !hasCommunityToLog
                : !hasCommunityToLog)
            }
            className="w-full py-5 text-base font-semibold"
          >
            {loading ? 'Submitting…' : selectedIsToday ? 'Submit today' : 'Submit missed log'}
          </Button>
        )}

        {mode === 'closed' && !checkingLog && (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Nothing to log for this day.</p>
            <div className="mt-4 flex justify-center gap-2">
              {pickerEnabled && selectedDate !== yesterday ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(yesterday)}>
                  Yesterday
                </Button>
              ) : null}
              {pickerEnabled && selectedDate !== today ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(today)}>
                  Today
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
