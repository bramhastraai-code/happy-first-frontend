'use client';

import { useEffect, useState } from 'react';
import { useWeeklyPlanStore } from '@/lib/store/weeklyPlanStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';

export default function WeeklyPlanPage() {
    const router = useRouter();
    const { userData } = useAuthStore();
    const {
        currentPlan,
        activities,
        isLoading,
        fetchCurrentPlan,
        fetchActivities,
        createPlan
    } = useWeeklyPlanStore();

    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [step, setStep] = useState<'view' | 'select' | 'configure'>('view');

    useEffect(() => {
        fetchCurrentPlan();
    }, [fetchCurrentPlan]);

    useEffect(() => {
        if (!currentPlan && !isLoading) {
            setStep('select');
            fetchActivities();
        } else {
            setStep('view');
        }
    }, [currentPlan, isLoading, fetchActivities]);

    const handleActivityToggle = (activity: any) => {
        if (selectedItems.find(i => i.id === activity.id)) {
            setSelectedItems(selectedItems.filter(i => i.id !== activity.id));
        } else {
            setSelectedItems([...selectedItems, { ...activity, cadence: 'daily', targetValue: 1 }]);
        }
    };

    const handleConfigChange = (id: string, field: string, value: any) => {
        setSelectedItems(selectedItems.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleSubmit = async () => {
        try {
            const payload = selectedItems.map(item => ({
                activityId: item.id,
                cadence: item.cadence,
                targetValue: Number(item.targetValue)
            }));
            await createPlan(payload);
            setStep('view');
        } catch (error) {
            console.error('Failed to create plan', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (step === 'view' && currentPlan) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-4xl font-black mb-2">Your Weekly Plan</h1>
                        <p className="text-blue-100">
                            Week of {new Date(currentPlan.weekStart).toLocaleDateString()} - {new Date(currentPlan.weekEnd).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentPlan.activities.map((activity: any, idx: number) => (
                        <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-800">{activity.label}</h3>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase">
                                    {activity.cadence}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Target:</span>
                                    <span className="font-bold">{activity.targetValue} {activity.unit}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Points:</span>
                                    <span className="font-bold text-purple-600">{Math.round(activity.pointsAllocated)} pts</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${(activity.achievedUnits / activity.targetValue) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-gray-900 mb-4">Design Your Week</h1>
                <p className="text-xl text-gray-600">Choose activities that bring you joy and health.</p>
            </div>

            {step === 'select' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activities.map((activity) => (
                            <div
                                key={activity.id}
                                onClick={() => handleActivityToggle(activity)}
                                className={`
                                    cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 transform hover:-translate-y-1
                                    ${selectedItems.find(i => i.id === activity.id)
                                        ? 'border-purple-600 bg-purple-50 shadow-lg scale-[1.02]'
                                        : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">{activity.icon || '🎯'}</div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{activity.name}</h3>
                                        <p className="text-sm text-gray-500 capitalize">{activity.unit}</p>
                                    </div>
                                    {selectedItems.find(i => i.id === activity.id) && (
                                        <div className="ml-auto text-purple-600">
                                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end mt-8">
                        <button
                            onClick={() => setStep('configure')}
                            disabled={selectedItems.length === 0}
                            className="px-8 py-4 bg-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next: Set Targets →
                        </button>
                    </div>
                </>
            )}

            {step === 'configure' && (
                <div className="space-y-6">
                    {selectedItems.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-3xl">{item.icon || '🎯'}</span>
                                <h3 className="text-xl font-bold">{item.name}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Frequency</label>
                                    <select
                                        value={item.cadence}
                                        onChange={(e) => handleConfigChange(item.id, 'cadence', e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Target ({item.unit})
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.targetValue}
                                        onChange={(e) => handleConfigChange(item.id, 'targetValue', e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-between mt-8">
                        <button
                            onClick={() => setStep('select')}
                            className="px-6 py-3 text-gray-600 font-semibold hover:text-gray-900 transition"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1"
                        >
                            Create My Plan ✨
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
