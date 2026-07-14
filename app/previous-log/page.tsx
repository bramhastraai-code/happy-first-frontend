'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type SubmitPreviousDailyLogData } from '@/lib/api/dailyLog';
import { invalidateDashboardQueries } from '@/lib/queries/invalidateDashboard';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import LoadingScreen from '@/components/ui/LoadingScreen';
import CompactDatePicker from '@/components/ui/CompactDatePicker';
import TaskCategorySection from '@/components/tasks/TaskCategorySection';
import { Calendar, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import { activityAPI, Activity as ActivityType } from '@/lib/api/activity';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';
import { resolveActivityId } from '@/lib/utils/activityId';
import { canSubmitPartialLog, extractEarnedPoints, validateLogSubmit } from '@/lib/utils/logSubmit';

type SummaryWithLogStatus = {
    isTodayLogged?: boolean;
    isFullyLogged?: boolean;
};

const getActivityInputMax = (activity: WeeklyPlanActivity, activityData?: ActivityType) => {
    const configuredMax = activityData?.values.find((v) => v.tier === 1)?.maxVal;
    const baseMax = typeof configuredMax === 'number' ? configuredMax : 500000;
    const isWeeklyNumericTarget = activity.cadence === 'weekly' && activity.unit.toLowerCase() !== 'days';
    return isWeeklyNumericTarget ? Math.max(baseMax, baseMax * 7) : baseMax;
};

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
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
    const [activities, setActivities] = useState<Record<string, number>>({});
    const [checkboxActivities, setCheckboxActivities] = useState<Record<string, boolean>>({});
    const [pendingSliders, setPendingSliders] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [canSubmit, setCanSubmit] = useState(false);
    const [deadlineMessage, setDeadlineMessage] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [logAlreadyExists, setLogAlreadyExists] = useState(false);
    const [checkingLog, setCheckingLog] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [warningActivities, setWarningActivities] = useState<Array<{label: string, value: number, target: number, percentage: number}>>([]);
    const [earnedPoints, setEarnedPoints] = useState(0);
    const [showCongrats, setShowCongrats] = useState(false);
    const [actlist, setActlist] = useState<ActivityType[]>([]);

    const extractErrorMessage = (err: unknown, fallback: string) => {
        if (
            typeof err === 'object' &&
            err !== null &&
            'response' in err &&
            typeof (err as { response?: unknown }).response === 'object' &&
            (err as { response?: unknown }).response !== null
        ) {
            const response = (err as { response?: { data?: { message?: string }; status?: number } }).response;
            return response?.data?.message || fallback;
        }
        return fallback;
    };

    const isPastDate = (date: DateTime) => {
        const todayStart = DateTime.now().startOf('day');
        return date.startOf('day') < todayStart;
    };

    useEffect(() => {
        activityAPI.getList()
            .then((res) => setActlist(res.data.data))
            .catch((err) => console.error('Failed to load activities:', err));
    }, []);

    useEffect(() => {
        setIsMounted(true);

        // Use date from calendar when available; otherwise default to yesterday.
        const requestedDate = searchParams.get('date');
        if (requestedDate) {
            const parsedRequestedDate = DateTime.fromISO(requestedDate, { zone: 'local' });
            if (parsedRequestedDate.isValid && isPastDate(parsedRequestedDate)) {
                setSelectedDate(parsedRequestedDate.toISODate() || '');
                return;
            }
        }

        const yesterday = DateTime.now().setZone('local').minus({ days: 1 });
        setSelectedDate(yesterday.toISODate()||'');
    }, [searchParams]);

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
        if (!isHydrated) return;
        if (!accessToken || !user) {
            router.push('/login');
        }
    }, [accessToken, user, router, isHydrated]);

    // Validate selected date for missed-log submission
    useEffect(() => {
        const checkDateWindow = () => {
            const now = new Date();

            // If a date is selected, validate it
            if (selectedDate) {
                // Parse selected date correctly (YYYY-MM-DD format)
                const [year, month, day] = selectedDate.split('-').map(Number);
                const selected = new Date(year, month - 1, day); // month is 0-indexed

                // Get today at midnight
                const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                if (selected.getTime() < todayMidnight.getTime()) {
                    setCanSubmit(true);
                    setDeadlineMessage('You can submit a missed log for this date.');
                } else if (selected.getTime() >= todayMidnight.getTime()) {
                    setCanSubmit(false);
                    setDeadlineMessage('You can only submit logs for past dates.');
                } else {
                    setCanSubmit(false);
                    setDeadlineMessage('Select a valid past date.');
                }
            } else {
                setCanSubmit(false);
                setDeadlineMessage('Loading selected date…');
            }
        };

        checkDateWindow();
        const interval = setInterval(checkDateWindow, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [selectedDate]);

    // Check if log exists for selected date and fetch weekly plan
    useEffect(() => {
        const checkLogAndFetchPlan = async () => {
            if (!selectedDate || !selectedProfile) return;

            try {
                setLoading(true);
                setCheckingLog(true);
                setError('');
                setLogAlreadyExists(false);

                // Check if all activities are already logged for this date
                try {
                    const summaryResponse = await dailyLogAPI.getSummary('daily', selectedDate);
                    if (summaryResponse.data.data ) {
                        const summaryData = summaryResponse.data.data as SummaryWithLogStatus;
                        if (summaryData.isFullyLogged) {
                            setLogAlreadyExists(true);
                            setCanSubmit(false);
                            setError('Log already submitted for this date.');
                            setLoading(false);
                            setCheckingLog(false);
                            return;
                        }
                    }
                } catch (err: unknown) {
                    // If 404 or no log found, that's good - continue to fetch weekly plan
                    // Any other error, just log it but continue (assuming no log exists)
                    const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
                    if (response?.status !== 404 && response?.data?.message !== 'No log found for this date') {
                        console.error('Error checking existing log:', err);
                    }
                    // Continue to fetch weekly plan if no log exists
                }

                setCheckingLog(false);

                // Fetch weekly plan
                const response = await weeklyPlanAPI.getCurrent(selectedDate);

                if (response.data.data) {
                    const plan = response.data.data;
                    setWeeklyPlan(plan);

                    // Initialize activities state
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
                    setActivities({});
                    setCheckboxActivities({});
                    setPendingSliders({});
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

        checkLogAndFetchPlan();
    }, [selectedDate, selectedProfile]);

    const handleActivityChange = (activityId: string, value: string) => {
        setActivities((prev) => ({
            ...prev,
            [activityId]: parseFloat(value) || 0,
        }));
    };

    const handleCheckboxChange = (activityId: string, checked: boolean) => {
        setCheckboxActivities((prev) => ({
            ...prev,
            [activityId]: checked,
        }));
    };

    const handlePendingChange = (activityId: string, isPending: boolean) => {
        setPendingSliders((prev) => ({
            ...prev,
            [activityId]: isPending,
        }));
    };

    const handleSubmit = async () => {
        if (!canSubmit || !selectedDate) {
            setError('Cannot submit at this time. Please check the deadline message.');
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
        setSuccess('');

        // Validate activities for warnings
        const warnings: Array<{label: string, value: number, target: number, percentage: number}> = [];
        
        Object.entries(activities).forEach(([activityId, value]) => {
            if (value > 0) {
                const activity = weeklyPlan?.activities.find(
                    (a) => resolveActivityId(a) === activityId
                );
                if (activity && activity.cadence !== 'weekly' && activity.label) {
                    const targetValue =  activity.targetValue;
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

        if (!weeklyPlan) {
            setError('No weekly plan found for the selected date.');
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
            const points = extractEarnedPoints(response.data.data);
            setEarnedPoints(points);
            await invalidateDashboardQueries(queryClient);

            const refreshedPlanResponse = await weeklyPlanAPI.getCurrent(selectedDate);
            const refreshedPlan = refreshedPlanResponse.data.data;
            if (refreshedPlan) {
                setWeeklyPlan(refreshedPlan);

                const resetValues: Record<string, number> = { ...activities };
                const resetCheckboxValues: Record<string, boolean> = { ...checkboxActivities };
                const resetPendingSliders: Record<string, boolean> = { ...pendingSliders };
                const submittedIds = new Set(validation.payload.map((entry) => entry.activityId));

                refreshedPlan.activities.forEach((activity) => {
                    const activityId = resolveActivityId(activity);
                    if (!submittedIds.has(activityId)) return;

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
            }

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
        // Trigger submission programmatically
        handleSubmit();
    };

    const handleCancelSubmit = () => {
        setShowWarning(false);
        setWarningActivities([]);
    };

    // Set max date to yesterday
    const getMaxDate = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    };

    if (!isMounted || !isHydrated) {
        return null;
    }

    const showForm = Boolean(selectedDate && weeklyPlan && !logAlreadyExists && canSubmit);

    return (
        <MainLayout>
            {showCongrats && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4">
                    <div className="app-card w-full max-w-sm p-6 text-center animate-scale-in">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-soft text-3xl">
                            ✓
                        </div>
                        <h1 className="text-xl font-bold text-foreground">Log submitted</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your missed day log was saved successfully.
                        </p>
                        <p className="mt-4 text-3xl font-bold tabular-nums text-primary">
                            +{earnedPoints.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">Points earned</p>
                        <p className="mt-4 text-xs text-muted-foreground">Redirecting to home…</p>
                    </div>
                </div>
            )}

            <PageHeader
                title="Missed day log"
                subtitle="Submit activity logs for a past date"
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
                        <p className="text-sm text-muted-foreground">
                            {formattedSelectedDate || 'Pick a past date'}
                        </p>
                        {selectedDate && (
                            <CompactDatePicker
                                value={selectedDate}
                                onChange={setSelectedDate}
                                maxDate={getMaxDate()}
                            />
                        )}
                    </div>
                </div>

                <div
                    className={cn(
                        'app-card p-4',
                        canSubmit ? 'border-success/30 bg-success-soft/40' : 'border-amber-200 bg-amber-50'
                    )}
                >
                    <div className="flex items-start gap-3">
                        <Clock className={cn('mt-0.5 h-5 w-5 shrink-0', canSubmit ? 'text-success' : 'text-amber-600')} />
                        <div>
                            <p className={cn('text-sm font-semibold', canSubmit ? 'text-success' : 'text-amber-900')}>
                                {deadlineMessage}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Missed logs must be submitted before 12:00 PM the next day.
                            </p>
                        </div>
                    </div>
                </div>

                {showForm && (
                    <div className="app-card p-4">
                        <p className="text-xs font-medium text-muted-foreground">Submitting for</p>
                        <p className="mt-0.5 text-base font-semibold text-foreground">{formattedSelectedDate}</p>
                        {checkingLog && (
                            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Checking existing log…
                            </p>
                        )}
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

                {showForm && (
                    <div className="space-y-4">
                        <h2 className="section-title">Log activities</h2>
                        {(['mind', 'body', 'soul'] as const).map((category) => (
                            <TaskCategorySection
                                key={category}
                                category={category}
                                activities={weeklyPlan!.activities}
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

                {success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>{success}</p>
                    </div>
                )}

                {showForm && (
                    <Button
                        onClick={handleSubmit}
                        disabled={
                            loading ||
                            !canSubmit ||
                            checkingLog ||
                            !weeklyPlan ||
                            !canSubmitPartialLog(weeklyPlan, activities, checkboxActivities, pendingSliders)
                        }
                        className="w-full py-5 text-base font-semibold"
                    >
                        {loading
                            ? 'Submitting…'
                            : checkingLog
                              ? 'Checking…'
                              : 'Submit missed log'}
                    </Button>
                )}

                {!weeklyPlan && !loading && selectedDate && !logAlreadyExists && (
                    <div className="app-card p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                            <div className="text-sm text-muted-foreground">
                                <p className="font-semibold text-foreground">How missed logs work</p>
                                <ul className="mt-2 list-inside list-disc space-y-1">
                                    <li>Pick a past date from the calendar</li>
                                    <li>Enter your activity values for that day</li>
                                    <li>Today and future dates are not allowed</li>
                                    <li>Points are added to your profile after submit</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
