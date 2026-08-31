'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import {
  getActiveMascotColor,
  MASCOT_THEME_EVENT,
} from '@/lib/theme/mascotTheme';

/** Current mascot colour, including live preview before Save. */
export function useMascotThemeColor(): string {
  const stored = useAuthStore((s) => s.selectedProfile?.preferences?.mascotColor);
  const [color, setColor] = useState(() => getActiveMascotColor(stored));

  useEffect(() => {
    const sync = () => setColor(getActiveMascotColor(stored));
    sync();
    window.addEventListener(MASCOT_THEME_EVENT, sync);
    return () => window.removeEventListener(MASCOT_THEME_EVENT, sync);
  }, [stored]);

  return color;
}
