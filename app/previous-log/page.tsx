'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type SubmitPreviousDailyLogData } from '@/lib/api/dailyLog';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';
import CustomSlider from '@/components/ui/CustomSlider';
import CustomNumericInput from '@/components/ui/CustomNumericInput';
import { DateTime } from 'luxon';

type SummaryWithLogStatus = {
    isTodayLogged?: boolean;
};

const getActivityInputMax = (activity: WeeklyPlanActivity) => {
    const configuredMax = activity.values?.find((v) => v.tier === 1)?.maxVal;
    const baseMax = typeof configuredMax === 'number' ? configuredMax : 500000;
    const isWeeklyNumericTarget = activity.cadence === 'weekly' && activity.unit.toLowerCase() !== 'days';
    return isWeeklyNumericTarget ? Math.max(baseMax, baseMax * 7) : baseMax;
};

export default function PreviousLogPage() {
    return (
        <Suspense
            fallback={
                <MainLayout>
                    <div className="flex min-h-screen items-center justify-center">
                        <div className="text-center">
                            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                            <p className="text-sm text-gray-600">Loading previous log...</p>
                        </div>
                    </div>
                </MainLayout>
            }
        >
            <PreviousLogPageContent />
        </Suspense>
    );
}

function PreviousLogPageContent() {
    const router = useRouter();
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

    // Redirect to home after showing congrats
    useEffect(() => {
        if (showCongrats) {
            const timer = setTimeout(() => {
                router.push('/home');
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
                    setDeadlineMessage('✓ You can submit a missed log for this date.');
                } else if (selected.getTime() >= todayMidnight.getTime()) {
                    setCanSubmit(false);
                    setDeadlineMessage('❌ You can only submit logs for past dates.');
                } else {
                    setCanSubmit(false);
                    setDeadlineMessage('❌ Select a valid past date.');
                }
            } else {
                setCanSubmit(false);
                setDeadlineMessage('📅 Loading selected date...');
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

                // Check if log already exists for this date
                try {
                    const summaryResponse = await dailyLogAPI.getSummary('daily', selectedDate);
                    // If we get a successful response with data, a log exists
                    if (summaryResponse.data.data ) {
                        const summaryData = summaryResponse.data.data as SummaryWithLogStatus;
                        // Check if there are any activities logged (meaning log exists)
                        if (summaryData.isTodayLogged ) {
                            setLogAlreadyExists(true);
                            setCanSubmit(false);
                            setError('✓ Log already submitted for this date. You cannot submit duplicate logs.');
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
                        const activityId = typeof activity.activity === 'object'
                            ? activity.activity
                            : activity.activity;

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

        setError('');
        setSuccess('');

        // Validate activities for warnings
        const warnings: Array<{label: string, value: number, target: number, percentage: number}> = [];
        
        Object.entries(activities).forEach(([activityId, value]) => {
            if (value > 0) {
                const activity = weeklyPlan?.activities.find(a => a.activity === activityId);
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
                }));

            const submitData: SubmitPreviousDailyLogData = {
                date: selectedDate,
                activities: [...numericActivities, ...checkboxActivityEntries],
            };

            const response = await dailyLogAPI.submitPrevious(submitData);
            setEarnedPoints(response.data.data.totalPoints);
            setShowCongrats(true);

        } catch (err: unknown) {
            console.error('Error submitting previous log:', err);
            setError(extractErrorMessage(err, 'Failed to submit previous day log'));
        } finally {
            setLoading(false);
        }
    };

    const getActivityName = (activity: WeeklyPlanActivity): string => {
        return activity.label as string;
    };

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
                            Previous day log submitted successfully!
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

            <div className="space-y-6 pb-20 px-4">
                {/* Header */}
                <div className="pt-6">
                    <h1 className="text-2xl font-bold text-gray-900">Submit Missed Day Log</h1>
                    <p className="text-gray-600 mt-1">
                        Submit activity logs for any past day from your calendar
                    </p>
                </div>

                {/* Date Picker */}
                <Card className="border-indigo-200 bg-indigo-50">
                    <CardContent className="p-4">
                        <label htmlFor="missed-log-date" className="block text-sm font-medium text-indigo-900 mb-2">
                            Choose a past date to log
                        </label>
                        <input
                            id="missed-log-date"
                            type="date"
                            value={selectedDate}
                            max={getMaxDate()}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                    </CardContent>
                </Card>

                {/* Deadline Warning Card */}
                <Card className={`border-2 ${canSubmit ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <Clock className={`w-5 h-5 mt-0.5 ${canSubmit ? 'text-green-600' : 'text-orange-600'}`} />
                            <div className="flex-1">
                                <p className={`font-medium ${canSubmit ? 'text-green-900' : 'text-orange-900'}`}>
                                    {deadlineMessage}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Previous day logs must be submitted before 12:00 PM of the next day
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Selected Date Display */}
                {!logAlreadyExists && canSubmit && (<Card className="border-blue-500 bg-blue-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                                <p className="text-sm text-blue-700 font-medium">Submitting log for:</p>
                                <p className="text-lg font-bold text-blue-900">
                                    {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                                {checkingLog && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        Checking if log already exists...
                                    </p>
                                )}
                                {logAlreadyExists && (
                                    <p className="text-xs text-red-600 font-medium mt-1">
                                        ⚠️ A log already exists for this date
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>)}

                {/* Warning Banner for Unusual Values */}
                {showWarning && warningActivities.length > 0 && (
                    <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 flex-shrink-0">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 mb-1">Unusual Values Detected</h3>
                                    <p className="text-sm text-slate-600 mb-3">
                                        The following activities have values that seem unusually low or high compared to your targets:
                                    </p>
                                    <div className="space-y-2 mb-4">
                                        {warningActivities.map((warning, index) => (
                                            <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-sm text-slate-900">{warning.label}</p>
                                                        <p className="text-xs text-slate-500">
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
                                            className="flex-1 border-slate-300 hover:bg-slate-50"
                                        >
                                            Go Back & Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleConfirmSubmit}
                                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                                        >
                                            Submit Anyway
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Activities Form */}
                {selectedDate && weeklyPlan && !logAlreadyExists && canSubmit && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Log Your Activities</h2>

                        {weeklyPlan.activities.map((activity) => {
                            const activityId = typeof activity.activity === 'object'
                                ? activity.activity
                                : activity.activity;
                            const activityName = getActivityName(activity);
                            const isCheckbox = activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days';

                            return (
                                <Card key={activityId} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900">{activityName}</h3>
                                                    <p className="text-sm text-gray-600">
                                                        {activity.cadence === 'daily' ? 'Daily' : 'Weekly'} •
                                                        Target: {activity.targetValue} {activity.unit}
                                                    </p>
                                                </div>
                                                <div className="text-sm font-medium text-purple-600">
                                                    {activity.pointsAllocated?.toFixed(2)} pts
                                                </div>
                                            </div>

                                            {isCheckbox ? (
                                                <div className="flex items-center gap-2">
                                                    <CustomSlider
                                                        checked={checkboxActivities[activityId] || false}
                                                        onChange={(checked) => handleCheckboxChange(activityId, checked)}
                                                        onPendingChange={(isPending) => handlePendingChange(activityId, isPending)}
                                                        disabled={false}
                                                    />
                                                    <span className="text-sm text-gray-600 min-w-20 text-right">
                                                        {(activity.pointsPerUnit || 0).toFixed(2)} pts/day
                                                    </span>
                                                </div>
                                            ) : (
                                                <CustomNumericInput
                                                    value={activities[activityId] || 0}
                                                    onChange={(val) => handleActivityChange(activityId, val.toString())}
                                                    min={0}
                                                    max={getActivityInputMax(activity)}
                                                    placeholder={`Enter ${activity.unit.toLowerCase()}`}
                                                    unit={activity.unit || ''}
                                                    pointsPerUnit={activity.pointsPerUnit || 0}
                                                    cadence={activity.cadence}
                                                    disabled={false}
                                                />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <Card className="border-red-500 bg-red-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertCircle className="w-5 h-5" />
                                <p>{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Success Message */}
                {success && (
                    <Card className="border-green-500 bg-green-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-green-800">
                                <ChevronRight className="w-5 h-5" />
                                <p>{success}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Submit Button */}
                {selectedDate && weeklyPlan && !logAlreadyExists && canSubmit && (
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit || checkingLog || Object.values(pendingSliders).some(isPending => isPending)}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : checkingLog ? 'Checking...' : Object.values(pendingSliders).some(isPending => isPending) ? 'Please Complete All Sliders' : 'Submit Previous Day Log'}
                    </Button>
                )}

                {/* Info Card */}
                {!weeklyPlan && !loading && selectedDate && (
                    <Card className="border-blue-500 bg-blue-50">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="flex-1 text-sm text-blue-900">
                                    <p className="font-medium mb-2">How to submit previous day logs:</p>
                                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                                        <li>Select any past date from the streak calendar</li>
                                        <li>Fill in your activity values</li>
                                        <li>Today and future dates are not allowed</li>
                                        <li>Points will be added to your profile</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
}
