'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { dailyLogAPI, type SubmitPreviousDailyLogData } from '@/lib/api/dailyLog';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import type { WeeklyPlan, WeeklyPlanActivity } from '@/lib/api/weeklyPlan';

export default function PreviousLogPage() {
    const router = useRouter();
    const { accessToken, user, isHydrated, selectedProfile } = useAuthStore();
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
    const [activities, setActivities] = useState<Record<string, number>>({});
    const [checkboxActivities, setCheckboxActivities] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [canSubmit, setCanSubmit] = useState(false);
    const [deadlineMessage, setDeadlineMessage] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [logAlreadyExists, setLogAlreadyExists] = useState(false);
    const [checkingLog, setCheckingLog] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        // Automatically set yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setSelectedDate(yesterday.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        if (!accessToken || !user) {
            router.push('/login');
        }
    }, [accessToken, user, router, isHydrated]);

    // Check if current time is before 6 PM and validate selected date
    useEffect(() => {
        const checkDeadline = () => {
            const now = new Date();
            const currentHour = now.getHours();


            // If a date is selected, validate it
            if (selectedDate) {
                // Parse selected date correctly (YYYY-MM-DD format)
                const [year, month, day] = selectedDate.split('-').map(Number);
                const selected = new Date(year, month - 1, day); // month is 0-indexed

                // Get yesterday's date at midnight
                const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const yesterday = new Date(todayMidnight);
                yesterday.setDate(yesterday.getDate() - 1);

                // Check if selected date is yesterday
                if (selected.getTime() === yesterday.getTime()) {
                    // Check if it's before 6 PM TODAY
                    if (currentHour < 22) {
                        setCanSubmit(true);
                        const minutesLeft = 60 - now.getMinutes();
                        const hoursLeft = 18 - currentHour - 1 + (minutesLeft === 60 ? 1 : 0);

                        setDeadlineMessage(`✓ You can submit yesterday's log. Deadline: Today at 6:00 PM (${hoursLeft}h ${minutesLeft}m left)`);
                    } else {
                        setCanSubmit(false);
                        setDeadlineMessage('⏰ Deadline passed! Previous day logs must be submitted before 6:00 PM of the next day');
                    }
                } else if (selected.getTime() >= todayMidnight.getTime()) {
                    setCanSubmit(false);
                    setDeadlineMessage('❌ You cannot submit logs for today or future dates');
                } else {
                    setCanSubmit(false);
                    setDeadlineMessage('❌ Deadline has passed. You can only submit logs for yesterday before 6:00 PM');
                }
            } else {
                setCanSubmit(false);
                setDeadlineMessage('📅 Loading yesterday\'s date...');
            }
        };

        checkDeadline();
        const interval = setInterval(checkDeadline, 60000); // Check every minute

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
                        const summaryData = summaryResponse.data.data as any;
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
                } catch (err: any) {
                    // If 404 or no log found, that's good - continue to fetch weekly plan
                    // Any other error, just log it but continue (assuming no log exists)
                    if (err.response?.status !== 404 && err.response?.data?.message !== 'No log found for this date') {
                        console.error('Error checking existing log:', err);
                    }
                    // Continue to fetch weekly plan if no log exists
                }

                setCheckingLog(false);

                // Fetch weekly plan
                const response = await weeklyPlanAPI.getCurrent();

                if (response.data.data) {
                    const plan = response.data.data;
                    setWeeklyPlan(plan);

                    // Initialize activities state
                    const initialActivities: Record<string, number> = {};
                    const initialCheckboxActivities: Record<string, boolean> = {};

                    plan.activities.forEach((activity) => {
                        const activityId = typeof activity.activity === 'object'
                            ? activity.activity
                            : activity.activity;

                        if (activity.cadence === 'weekly' && activity.unit.toLowerCase() === 'days') {
                            initialCheckboxActivities[activityId] = false;
                        } else {
                            initialActivities[activityId] = 0;
                        }
                    });

                    setActivities(initialActivities);
                    setCheckboxActivities(initialCheckboxActivities);
                }
            } catch (err: any) {
                console.error('Error fetching weekly plan:', err);
                setError(err.response?.data?.message || 'Failed to load weekly plan');
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

    const handleSubmit = async () => {
        if (!canSubmit || !selectedDate) {
            setError('Cannot submit at this time. Please check the deadline message.');
            return;
        }

        if (!selectedProfile) {
            setError('No profile selected');
            return;
        }

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

            const submitData: SubmitPreviousDailyLogData = {
                date: selectedDate,
                activities: [...numericActivities, ...checkboxActivityEntries],
            };

            const response = await dailyLogAPI.submitPrevious(submitData);
            setSuccess(`Previous day log submitted! Points earned: ${response.data.data.totalPoints}`);

            // Reset form after successful submission
            setTimeout(() => {
                router.push('/home');
            }, 2000);

        } catch (err: any) {
            console.error('Error submitting previous log:', err);
            setError(err.response?.data?.message || 'Failed to submit previous day log');
        } finally {
            setLoading(false);
        }
    };

    const getActivityName = (activity: WeeklyPlanActivity): string => {
        return activity.label as string;
    };

    // Set max date to yesterday
    const getMaxDate = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    };

    // Set min date to 1 day ago (yesterday only)
    const getMinDate = () => {
        return getMaxDate();
    };

    if (!isMounted || !isHydrated) {
        return null;
    }


    return (
        <MainLayout>
            <div className="space-y-6 pb-20 px-4">
                {/* Header */}
                <div className="pt-6">
                    <h1 className="text-2xl font-bold text-gray-900">Submit Previous Day Log</h1>
                    <p className="text-gray-600 mt-1">
                        Submit your missed log from yesterday
                    </p>
                </div>

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
                                    Previous day logs must be submitted before 6:00 PM of the next day
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
                                                    {activity.pointsAllocated} pts
                                                </div>
                                            </div>

                                            {isCheckbox ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`activity-${activityId}`}
                                                        checked={checkboxActivities[activityId] || false}
                                                        onChange={(e) => handleCheckboxChange(activityId, e.target.checked)}
                                                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                                    />
                                                    <label
                                                        htmlFor={`activity-${activityId}`}
                                                        className="text-sm text-gray-700 cursor-pointer"
                                                    >
                                                        Mark as completed for this day
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Value ({activity.unit})
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={activity.values?.find(v => v.tier === 1)?.maxVal || 100000}
                                                        onBlur={(e) => {
                                                            // Clamp value on blur
                                                            let val = parseFloat(e.target.value) || 0;
                                                            if (val < 0) val = 0;
                                                            if (val > (activity.values?.find(v => v.tier === 1)?.maxVal || 100000)) {
                                                                val = activity.values?.find(v => v.tier === 1)?.maxVal || 100000;
                                                            }
                                                            handleActivityChange(activityId, val.toString());
                                                        }}
                                                        step="any"
                                                        value={activities[activityId] || 0}
                                                        onChange={(e) => {
                                                            // Allow free typing without clamping
                                                            handleActivityChange(activityId, e.target.value);
                                                        }}
                                                        placeholder={`Enter ${activity.unit.toLowerCase()}`}
                                                    />
                                                </div>
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
                        disabled={loading || !canSubmit || checkingLog}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : checkingLog ? 'Checking...' : 'Submit Previous Day Log'}
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
                                        <li>Yesterday`s date is automatically selected</li>
                                        <li>Fill in your activity values</li>
                                        <li>Submit before 6:00 PM today</li>
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
