'use client';

import { HappyFirstMascot } from '@/components/ui/HappyFirstMascot';
import { useAuthStore } from '@/lib/store/authStore';

interface UserMascotProps {
  className?: string;
  size?: number;
}

/**
 * Mascot that uses the selected profile's name (or a TBD placeholder).
 * Colour comes from CSS vars applied by MascotThemeProvider.
 */
export function UserMascot({ className, size = 96 }: UserMascotProps) {
  const name = useAuthStore((s) => s.selectedProfile?.preferences?.mascotName);
  const title = (name || '').trim() || 'Happy First mascot (name to be decided)';
  return <HappyFirstMascot className={className} size={size} title={title} />;
}
