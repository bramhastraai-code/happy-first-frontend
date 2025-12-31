'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Lock, User, UserPlus, Users, ChevronRight, LogOut } from 'lucide-react';
import { authAPI } from '@/lib/api/auth';

export default function SettingsPage() {
  const router = useRouter();
  const { user, accessToken, logout, profiles,selectedProfile } = useAuthStore();
  const [userData, setUserData] = useState<typeof user | null>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!accessToken) return;
      try {
        const userInfo = await authAPI.userInfo();
        setUserData(userInfo.data.data);

      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserData();
  }, [accessToken]);

  const hasFamilyMembers = profiles&& profiles.length > 1;
  
  

  const profileManagementItems = [
    ...(hasFamilyMembers ? [{
      icon: <Users className="w-5 h-5" />,
      label: 'Switch Profile',
      description: 'Change to a different family member profile',
      onClick: () => router.push('/select-profile'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    }] : []),
    {
      icon: <UserPlus className="w-5 h-5" />,
      label: 'Add Family Member',
      description: 'Add a new family member profile',
      onClick: () => router.push('/add-family-member'),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: <User className="w-5 h-5" />,
      label: 'Edit Profile',
      description: 'Update your personal details',
      onClick: () => router.push('/profile-setup'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  // Mobile-only items (shown only on screens < 520px)
  const mobileOnlyItems = [
    ...(hasFamilyMembers ? [{
      icon: <Users className="w-5 h-5" />,
      label: 'Switch Profile',
      description: 'Change to a different family member profile',
      onClick: () => router.push('/select-profile'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    }] : []),
    {
      icon: <LogOut className="w-5 h-5" />,
      label: 'Logout',
      description: 'Sign out of your account',
      onClick: handleLogout,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  const settingsSections = [
    {
      title: 'Quick Actions',
      items: mobileOnlyItems,
      mobileOnly: true, // Show only on mobile
    },
    {
      title: 'Profile Management',
      items: profileManagementItems,
    },
    {
      title: 'Security',
      items: [
        {
          icon: <Lock className="w-5 h-5" />,
          label: 'Change Password',
          description: 'Update your account password',
          onClick: () => router.push('/change-password'),
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        },
      ],
    },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Profile & Security</h1>
          </div>

          {/* User Info Card */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                {userData?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900">{selectedProfile?.name}</h3>
                <p className="text-sm text-gray-600">{userData?.phoneNumber}</p>
                <p className="text-xs text-gray-500">{userData?.email}</p>
              </div>
            </div>
          </Card>

          {/* Profile Completion Banner */}
          {selectedProfile && (() => {
            // Calculate profile completion percentage
            const profileFields = [
              selectedProfile.profile?.profession,
              selectedProfile.profile?.challenges,
              selectedProfile.profile?.goals,
              selectedProfile.profile?.likes,
              selectedProfile.profile?.personalCare,
              selectedProfile.profile?.dislikes,
              selectedProfile.profile?.medicalConditions,
              selectedProfile.profile?.health,
              selectedProfile.profile?.family,
              selectedProfile.profile?.schedule,
            ];
            const completedFields = profileFields.filter(field => field !== null && field !== undefined && field !== '').length;
            const completionPercentage = Math.round((completedFields / profileFields.length) * 100);
            
            return completionPercentage < 100 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900 mb-1">
                        Profile {completionPercentage}% Complete
                      </p>
                      <p className="text-xs text-yellow-700">
                        Complete your profile to get personalized recommendations
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/profile-setup')}
                    className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors whitespace-nowrap ml-3"
                  >
                    Complete Profile
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 bg-yellow-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-600 rounded-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-yellow-700">
                    {completedFields} of {profileFields.length} fields completed
                  </p>
                </div>
              </div>
            ) : null;
          })()}

          {/* Settings Sections */}
          <div className="space-y-6">
            {settingsSections.map((section, sectionIndex) => {
              // Hide or show based on mobileOnly flag
              const isMobileOnly = section.mobileOnly || false;
              const sectionClass = isMobileOnly ? 'max-[519px]:block hidden' : '';
              
              return (
              <div key={sectionIndex} className={sectionClass}>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  {section.title}
                </h2>
                <Card className="divide-y divide-gray-100">
                  {section.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center ${item.color}`}>
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.label}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </Card>
              </div>
            );
            })}
          </div>

          {/* Info Box */}
          <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>Tip:</strong> You can manage up to 5 family member profiles. Each profile has its own progress tracking and activity history.
            </p>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
