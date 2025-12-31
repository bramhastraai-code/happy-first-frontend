'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function ProfileSwitcher() {
  const router = useRouter();
  const { user, needsProfileSelection, setProfileSelectedInSession,profiles } = useAuthStore();

  if (!profiles || profiles.length <= 1) {
    return null;
  }

  const handleSwitchProfile = () => {
    // Reset the profile selection session flag
    setProfileSelectedInSession(false);
    // Navigate to profile selection
    router.push('/select-profile');
  };

  return (
    <Button
      onClick={handleSwitchProfile}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <RefreshCw className="w-4 h-4" />
      <span>Switch Profile</span>
    </Button>
  );
}
