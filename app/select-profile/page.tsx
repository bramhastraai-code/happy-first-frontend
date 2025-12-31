'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore,Profile } from '@/lib/store/authStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, UserPlus, Heart, Users } from 'lucide-react';


export default function SelectProfilePage() {
  const router = useRouter();
  const { user, profiles, setSelectedProfile, needsProfileSelection, isHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Wait for store to hydrate
    if (!isHydrated) return;

    // Redirect if user is not authenticated
    if (!user) {
      router.push('/login');
      return;
    }
    if (profiles?.length === 1) {
      setSelectedProfile(profiles?.[0] || null);
      router.push('/home');
      return;
    }
  }, [user, isHydrated, needsProfileSelection, router, setSelectedProfile]);

  const handleSelectProfile = (profile: Profile ) => {
    setLoading(true);
    setSelectedProfile(profile);

    // Small delay for better UX
    setTimeout(() => {
      router.push('/home');
    }, 300);
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship.toLowerCase()) {
      case 'self':
        return <User className="w-8 h-8" />;
      case 'spouse':
      case 'partner':
        return <Heart className="w-8 h-8" />;
      case 'child':
      case 'son':
      case 'daughter':
        return <Users className="w-8 h-8" />;
      default:
        return <User className="w-8 h-8" />;
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'male':
        return 'from-blue-500 to-blue-600';
      case 'female':
        return 'from-pink-500 to-pink-600';
      default:
        return 'from-purple-500 to-purple-600';
    }
  };

  const getLevelBadgeColor = (level?: string) => {
    switch (level) {
      case 'newbie':
        return 'bg-gray-500';
      case 'bronze':
        return 'bg-amber-700';
      case 'silver':
        return 'bg-gray-400';
      case 'gold':
        return 'bg-yellow-500';
      case 'diamond':
        return 'bg-blue-400';
      case 'legend':
        return 'bg-purple-600';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const familyMembers = profiles || [];
  const canAddMore = familyMembers.length < 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Select Profile
          </h1>
          <p className="text-gray-600">Choose who&apos;s using the app</p>
        </div>

        {/* Main User Profile Card */}
       
        {/* Family Members Section */}
        {familyMembers.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Family Members</h2>
              <span className="text-sm text-gray-600">{familyMembers.length}/5 profiles</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {familyMembers.map((member, index) => (
                <Card
                  key={index}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => handleSelectProfile(member)}
                >
                  <div className="p-6 flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getGenderColor(member.gender)} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                      {getRelationshipIcon(member.relationship)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                        {member.level && (
                          <span className={`text-xs px-2 py-1 rounded-full text-white ${getLevelBadgeColor(member.level)}`}>
                            {member.level.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{member.relationship}</p>
                      <p className="text-xs text-gray-500">{member.age} years • {member.gender}</p>
                    </div>
                    <div className="text-blue-600 group-hover:translate-x-1 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Add New Profile Card */}
        {canAddMore && (
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors cursor-pointer group"
            onClick={() => router.push('/add-family-member')}
          >
            <div className="p-6 flex items-center justify-center space-x-3 text-gray-500 group-hover:text-blue-600 transition-colors">
              <UserPlus className="w-6 h-6" />
              <span className="font-medium">Add Family Member Profile</span>
            </div>
          </Card>
        )}

        {!canAddMore && (
          <div className="text-center text-sm text-gray-500 mt-4">
            <p>Maximum 5 profiles reached</p>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 backdrop-blur-3xl flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 font-medium">Loading profile...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
