'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WelcomeOnboarding from '@/components/onboarding/WelcomeOnboarding';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useAuthStore } from '@/lib/store/authStore';

export default function WelcomePage() {
  const router = useRouter();
  const { accessToken, isHydrated, sessionReady, user, selectedProfile } = useAuthStore();

  useEffect(() => {
    if (!isHydrated || !sessionReady) return;
    if (!accessToken || !user) {
      router.replace('/login');
      return;
    }
    if (selectedProfile?.happinessOnboarding?.completedAt) {
      router.replace('/create-plan');
    }
  }, [accessToken, isHydrated, sessionReady, user, selectedProfile, router]);

  if (!isHydrated || !sessionReady || !accessToken || !user) {
    return <LoadingScreen fullScreen label="Welcome…" />;
  }

  return <WelcomeOnboarding />;
}
