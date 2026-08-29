'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { applyMascotTheme, clearMascotTheme } from '@/lib/theme/mascotTheme';

/**
 * Applies the selected profile's mascot colour to CSS variables so the app
 * (and mascot) paint in that colour. Clears when logged out / no profile.
 */
export default function MascotThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const selectedProfile = useAuthStore((s) => s.selectedProfile);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;
    if (selectedProfile?.preferences?.mascotColor) {
      applyMascotTheme(selectedProfile.preferences.mascotColor);
    } else if (selectedProfile) {
      applyMascotTheme(undefined);
    } else {
      clearMascotTheme();
    }
  }, [isHydrated, selectedProfile?._id, selectedProfile?.preferences?.mascotColor]);

  return <>{children}</>;
}
