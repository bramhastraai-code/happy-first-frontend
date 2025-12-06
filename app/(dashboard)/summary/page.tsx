'use client';

import { useEffect, useState } from 'react';
import { useDailyLogStore } from '@/lib/store/dailyLogStore';

export default function SummaryPage() {
    const { todaySummary, weeklySummary, isLoading, fetchTodaySummary, fetchWeeklySummary } = useDailyLogStore();
    const [view, setView] = useState<'daily' | 'weekly'>('daily');

    useEffect(() => {
        if (view === 'daily') {
            fetchTodaySummary();
        } else {
            fetchWeeklySummary();
        }
    }, [view, fetchTodaySummary, fetchWeeklySummary]);

    const summary = view === 'daily' ? todaySummary : weeklySummary;

    if (isLoading && !summary) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="text-center py-20 animate-fade-in">
                <p className="text-gray-600 mb-4">No summary data available.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header & Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 mb-2">Your Progress</h1>
                    <p className="text-gray-600">See how far you've come!</p>
                </div>
                <div className="bg-gray-100 p-1 rounded-xl flex">
                    <button
                        onClick={() => setView('daily')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${view === 'daily' ? 'bg-white shadow-md text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setView('weekly')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${view === 'weekly' ? 'bg-white shadow-md text-purple-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Weekly
                    </button>
                </div>
            </div>

            {/* Main Stats Card */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    <div>
                        <p className="text-blue-100 mb-1 uppercase text-sm font-bold tracking-wider">Total Points</p>
                        <p className="text-5xl font-black">{Math.round(summary.totalPoints)}</p>
                    </div>
                    {view === 'weekly' && (
                        <div>
                            <p className="text-blue-100 mb-1 uppercase text-sm font-bold tracking-wider">Completion</p>
                            <p className="text-5xl font-black">{Math.round(summary.completionPercentage)}%</p>
                        </div>
                    )}
                    {view === 'weekly' && (
                        <div>
                            <p className="text-blue-100 mb-1 uppercase text-sm font-bold tracking-wider">Streak</p>
                            <p className="text-5xl font-black">{summary.streak} <span className="text-2xl">🔥</span></p>
                        </div>
                    )}
                </div>
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            </div>

            {/* Activity Breakdown */}
            <div className="grid grid-cols-1 gap-6">
                <h2 className="text-2xl font-bold text-gray-800">Activity Breakdown</h2>
                {summary.activities.map((activity: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{activity.activity}</h3>
                            <div className="text-right">
                                <span className="block text-2xl font-black text-purple-600">
                                    {Math.round(activity.pointsEarned)}
                                    <span className="text-sm text-gray-400 font-normal ml-1">/ {Math.round(activity.pointsAllocated)} pts</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Progress</span>
                            <span className="font-bold">
                                {activity.achieved} / {activity.target} {activity.unit}
                            </span>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all duration-1000 ${activity.status === 'completed' ? 'bg-green-500' : 'bg-purple-500'
                                    }`}
                                style={{ width: `${Math.min(100, (activity.achieved / activity.target) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
