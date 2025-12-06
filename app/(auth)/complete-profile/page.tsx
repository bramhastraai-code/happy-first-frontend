'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { completeProfile, skipProfile } = useAuthStore();
    const [showOptional, setShowOptional] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
        city: '',
        dateOfBirth: '',
        timezone: 'Asia/Kolkata',
        reminderTime: '21:00',
        profile: {
            health: '',
            goals: '',
            challenges: '',
            likes: '',
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            if (showOptional) {
                await completeProfile(formData);
            } else {
                await skipProfile({
                    password: formData.password,
                    city: formData.city,
                    dateOfBirth: formData.dateOfBirth,
                });
            }
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Profile completion failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-2xl w-full mx-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        Complete Your Profile
                    </h1>
                    <p className="text-gray-600">
                        Help us personalize your wellness journey
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Required Fields */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                            Required Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Min 6 characters"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirm Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Confirm password"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Your city"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date of Birth *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Optional Fields Toggle */}
                    <button
                        type="button"
                        onClick={() => setShowOptional(!showOptional)}
                        className="w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-medium py-2 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 transition"
                    >
                        {showOptional ? (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                                Hide Optional Details
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Optional Details (Recommended)
                            </>
                        )}
                    </button>

                    {/* Optional Fields */}
                    {showOptional && (
                        <div className="space-y-4 border-t pt-6">
                            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                Optional Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Timezone
                                    </label>
                                    <select
                                        value={formData.timezone}
                                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="America/New_York">America/New_York (EST)</option>
                                        <option value="Europe/London">Europe/London (GMT)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Daily Reminder Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.reminderTime}
                                        onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Health Status
                                </label>
                                <textarea
                                    value={formData.profile.health}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, health: e.target.value } })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Tell us about your current health..."
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your Goals
                                </label>
                                <textarea
                                    value={formData.profile.goals}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, goals: e.target.value } })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="What do you want to achieve?"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Challenges
                                </label>
                                <textarea
                                    value={formData.profile.challenges}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, challenges: e.target.value } })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="What challenges do you face?"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Activities You Like
                                </label>
                                <input
                                    type="text"
                                    value={formData.profile.likes}
                                    onChange={(e) => setFormData({ ...formData, profile: { ...formData.profile, likes: e.target.value } })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="e.g., Yoga, Swimming, Running"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : showOptional ? 'Complete Profile' : 'Continue with Basics'}
                        </button>
                    </div>
                </form>

                <p className="text-sm text-gray-500 text-center mt-6">
                    💡 You can always update your profile later from settings
                </p>
            </div>
        </div>
    );
}
