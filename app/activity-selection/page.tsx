'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { activityAPI } from '@/lib/api/activity';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { log } from 'util';
import { set } from 'zod';

export default function ActivitySelectionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<any[]>([]);
    const [selectedActivities, setSelectedActivities] = useState<any[]>([]);
    const [step, setStep] = useState<'select' | 'configure'>('select');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            const response = await activityAPI.getList(1,true);
            setActivities(response.data.data);
        } catch (error) {
            console.error('Failed to fetch activities:', error);
            setError('Failed to load activities. Please try again.');
        }
    };

    const toggleActivity = (activity: any) => {
        const exists = selectedActivities.find((a) => a.activityId === activity._id);
        if (exists) {
            setSelectedActivities(selectedActivities.filter((a) => a.activityId !== activity._id));
        } else {
            setSelectedActivities([
                ...selectedActivities,
                {
                    activityId: activity._id,
                    name: activity.name,
                    cadence: 'daily',
                    targetValue: 0,
                    baseUnit: activity.baseUnit,
                },
            ]);
        }
    };

    const updateActivityTarget = (activityId: string, field: string, value: any) => {
        setSelectedActivities(
            selectedActivities.map((act) =>
                act.activityId === activityId ? { ...act, [field]: value } : act
            )
        );
    };

    const handleNext = () => {
        if (selectedActivities.length < 4) {
            setError('Please select at least 4 activities');
            return;
        }
        setError('');
        setStep('configure');
    };

    const handleSubmit = async () => {
        // Validate targets
        const hasInvalidTargets = selectedActivities.some((a) => a.targetValue === 0);
        if (hasInvalidTargets) {
            setError('Please set target values for all selected activities');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Create weekly plan with selected activities
            await weeklyPlanAPI.firstSetup({
                activities: selectedActivities.map((act) => ({
                    activityId: act.activityId,
                    cadence: act.cadence,
                    targetValue: act.targetValue,
                })),
            });
            // Redirect to profile setup
            router.push('/profile-setup');
        } catch (error: any) {
            console.error('Failed to save activities:', error);
            setError(error.response?.data?.message || 'Failed to save activities. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getActivityEmoji = (name: string) => {
        const emojiMap: { [key: string]: string } = {
            'Steps': '👣',
            'Yoga': '🧘',
            'Gym': '🏋️',
            'Floors': '🏢',
            'Sleep': '😴',
            'Water': '💧',
            'Happy Days': '😊',
            'Healthy Eating': '🥗',
        };
        return emojiMap[name] || '✨';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {step === 'select' ? 'Choose Your Activities' : 'Set Your Targets'}
                    </h1>
                    <p className="text-gray-600">
                        {step === 'select'
                            ? 'Select at least 4 activities to track your wellness journey'
                            : 'Configure your weekly targets for each activity'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Step 1: Select Activities */}
                {step === 'select' && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {activities.map((activity) => {
                                    const isSelected = selectedActivities.some(
                                        (a) => a.activityId === activity._id
                                    );
                                    return (
                                        <button
                                            key={activity._id}
                                            onClick={() => toggleActivity(activity)}
                                            className={`p-4 rounded-lg border-2 transition-all ${isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">
                                                {getActivityEmoji(activity.name)}
                                            </div>
                                            <p className="font-medium text-sm">{activity.name}</p>
                                            <p className="text-xs text-gray-500">{activity.description}</p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    Selected: {selectedActivities.length} / 4 minimum
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Configure Targets */}
                {step === 'configure' && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {selectedActivities.map((activity) => (
                                    <div key={activity.activityId} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xl">{getActivityEmoji(activity.name)}</span>
                                            <h3 className="font-semibold text-gray-900">{activity.name}</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Frequency
                                                </label>
                                                <select
                                                    value={activity.cadence}
                                                    onChange={(e) =>
                                                        updateActivityTarget(activity.activityId, 'cadence', e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                  {activities.find(activityi => activityi._id === activity.activityId)?.allowedCadence.map((cadence: 'daily' | 'weekly') => (
                                                    <option key={cadence} value={cadence}>
                                                      {cadence.charAt(0).toUpperCase() + cadence.slice(1)}
                                                    </option>
                                                  ))}

                                                    
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Target ({activity.baseUnit})
                                                </label>
                                                <Input
                                                    type="number"
                                                    value={activity.targetValue}
                                                    onChange={(e) =>
                                                        updateActivityTarget(
                                                            activity.activityId,
                                                            'targetValue',
                                                            parseFloat(e.target.value) || 0
                                                        )
                                                    }
                                                    placeholder="0"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 mt-6">
                    {step === 'configure' && (
                        <Button
                            variant="outline"
                            onClick={() => setStep('select')}
                            className="flex-1"
                        >
                            Back
                        </Button>
                    )}
                    <Button
                        onClick={step === 'select' ? handleNext : handleSubmit}
                        disabled={
                            loading ||
                            (step === 'select' && selectedActivities.length < 4) ||
                            (step === 'configure' && selectedActivities.some((a) => a.targetValue === 0))
                        }
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? 'Saving...' : step === 'select' ? 'Next' : 'Continue'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
