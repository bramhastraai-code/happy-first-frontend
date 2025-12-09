'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    timezone: 'Asia/Kolkata',
    reminderTime: '21:00',
    profile: {
      health: '',
      family: '',
      profession: '',
      schedule: '',
      challenges: '',
      goals: '',
      likes: '',
      dislikes: '',
      unitsPreference: {
        distance: 'km' as 'km' | 'miles',
        volume: 'L' as 'L' | 'oz',
        steps: 'steps' as 'steps',
      },
    },
    preferences: {
      tone: 'coach' as 'soft' | 'coach' | 'strict',
    },
  });

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Update profile
      await authAPI.updateProfile(profileData);

      router.push('/home');
    } catch (error) {
      console.error('Setup failed:', error);
      alert('Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {step} of 2</span>
            <span className="text-sm font-medium text-gray-700">{(step / 2) * 100}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Tell us about yourself
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Health Status
                </label>
                <textarea
                  value={profileData.profile.health}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, health: e.target.value },
                    })
                  }
                  placeholder="Generally healthy, occasional back pain..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family
                </label>
                <Input
                  value={profileData.profile.family}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, family: e.target.value },
                    })
                  }
                  placeholder="Married with 2 kids"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profession
                </label>
                <Input
                  value={profileData.profile.profession}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, profession: e.target.value },
                    })
                  }
                  placeholder="Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Schedule
                </label>
                <Input
                  value={profileData.profile.schedule}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, schedule: e.target.value },
                    })
                  }
                  placeholder="9-6 work, evenings free"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Goals & Preferences */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Your Goals & Preferences
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Challenges
                </label>
                <textarea
                  value={profileData.profile.challenges}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, challenges: e.target.value },
                    })
                  }
                  placeholder="Finding time for exercise"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goals
                </label>
                <textarea
                  value={profileData.profile.goals}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, goals: e.target.value },
                    })
                  }
                  placeholder="Lose 5kg, improve flexibility"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Likes
                </label>
                <Input
                  value={profileData.profile.likes}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, likes: e.target.value },
                    })
                  }
                  placeholder="Yoga, swimming"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dislikes
                </label>
                <Input
                  value={profileData.profile.dislikes}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      profile: { ...profileData.profile, dislikes: e.target.value },
                    })
                  }
                  placeholder="Running"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivation Tone
                </label>
                <select
                  value={profileData.preferences.tone}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      preferences: {
                        ...profileData.preferences,
                        tone: e.target.value as 'soft' | 'coach' | 'strict',
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="soft">Soft (like a mother)</option>
                  <option value="coach">Coach (like a friend)</option>
                  <option value="strict">Strict (like a father)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Time
                </label>
                <Input
                  type="time"
                  value={profileData.reminderTime}
                  onChange={(e) =>
                    setProfileData({ ...profileData, reminderTime: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Saving...' : step === 2 ? 'Complete Setup' : 'Next'}
          </Button>
        </div>

        {step === 1 && (
          <button
            onClick={() => router.push('/home')}
            className="w-full mt-3 text-center text-sm text-gray-600 hover:text-gray-900"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
