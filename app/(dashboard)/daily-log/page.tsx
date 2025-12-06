'use client';

import { useEffect, useState } from 'react';
import { useDailyLogStore } from '@/lib/store/dailyLogStore';
import { useRouter } from 'next/navigation';

export default function DailyLogPage() {
    const router = useRouter();
    const { todaySummary, isLoading, fetchTodaySummary, submitLog } = useDailyLogStore();
    const [logValues, setLogValues] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTodaySummary();
    }, [fetchTodaySummary]);

    const handleValueChange = (activityId: string, value: string) => {
        setLogValues({
            ...logValues,
            [activityId]: Number(value)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const activitiesToSubmit = Object.entries(logValues)
                .filter(([_, value]) => value > 0)
                .map(([activityId, value]) => ({
                    activityId,
                    value
                }));

            if (activitiesToSubmit.length > 0) {
                await submitLog(activitiesToSubmit);
                setLogValues({}); // Clear inputs after success
            }
        } catch (error) {
            console.error('Failed to submit log', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading && !todaySummary) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!todaySummary?.activities?.length) {
        return (
            <div className="text-center py-20 animate-fade-in">
                <div className="text-6xl mb-6">📅</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">No Activities for Today</h1>
                <p className="text-gray-600 mb-8">You haven't set up a weekly plan yet or there are no activities scheduled for today.</p>
                <button
                    onClick={() => router.push('/dashboard/weekly-plan')}
                    className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg"
                >
                    Create Weekly Plan
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black mb-2">Daily Log</h1>
                    <p className="text-purple-100 text-lg">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="mt-6 flex items-center gap-4">
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4">
                            <p className="text-sm text-purple-100 mb-1">Points Earned Today</p>
                            <p className="text-3xl font-black">{Math.round(todaySummary.totalPoints)}</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-xl p-4">
                            <p className="text-sm text-purple-100 mb-1">Weekly Progress</p>
                            <p className="text-3xl font-black">
                                {Math.round(todaySummary.weeklyProgress?.currentPoints || 0)}
                                <span className="text-lg text-purple-200 font-normal"> / 100</span>
                            </p>
                        </div>
                    </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            </div>

            {/* Activity List */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                    {todaySummary.activities.map((activity: any, idx: number) => {
                        const isCompleted = activity.status === 'completed';
                        // We need the activityId to submit logs. 
                        // Assuming the backend returns the activity ID in the summary or we can match it.
                        // Wait, getDailySummary returns `activity: planActivity.label`. It doesn't seem to return the ID directly in the mapped object.
                        // Let's check dailyLogService.js again.
                        // It maps: activity: planActivity.label.
                        // This is a problem. I need the ID to submit.
                        // I should verify if I need to update the backend service to return the ID.

                        // For now, I'll assume I might need to fix the backend.
                        // Let's check the backend service code I viewed earlier.
                        // Line 160: const activitySummary = weeklyPlan.activities.map(...)
                        // It returns { activity: planActivity.label, ... }
                        // It does NOT return the activityId.
                        // I MUST FIX THE BACKEND SERVICE FIRST.
                        return (
                            <div key={idx} className={`bg-white rounded-2xl p-6 shadow-md border-l-8 ${isCompleted ? 'border-green-500' : 'border-purple-500'} transition-all hover:shadow-lg`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-gray-800">{activity.activity}</h3>
                                            {isCompleted && (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    Completed
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-gray-600">
                                            <div>
                                                Target: <span className="font-bold">{activity.target} {activity.unit}</span>
                                            </div>
                                            <div>
                                                Achieved: <span className={`font-bold ${isCompleted ? 'text-green-600' : 'text-purple-600'}`}>{activity.achieved}</span>
                                            </div>
                                            <div>
                                                Points: <span className="font-bold text-orange-500">+{Math.round(activity.pointsEarned)}</span>
                                            </div>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-purple-500'}`}
                                                style={{ width: `${Math.min(100, (activity.achieved / activity.target) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 min-w-[200px]">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Add..."
                                                value={logValues[activity.activityId] || ''}
                                                onChange={(e) => handleValueChange(activity.activityId, e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                                {activity.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={submitting || Object.keys(logValues).length === 0}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {submitting ? 'Saving...' : 'Log Activity 📝'}
                    </button>
                </div>
            </form>
        </div>
    );
}
