'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { User, Users } from 'lucide-react';

export function ProfileBadge() {
  const { user, selectedProfile } = useAuthStore();

  if (!user) return null;

  const displayName = selectedProfile?.name || user.name || 'Me';
  const isMainProfile = !selectedProfile || selectedProfile.relationship === 'self';

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium shadow-md">
      {isMainProfile ? (
        <User className="w-4 h-4" />
      ) : (
        <Users className="w-4 h-4" />
      )}
      <span>{displayName}</span>
    </div>
  );
}
