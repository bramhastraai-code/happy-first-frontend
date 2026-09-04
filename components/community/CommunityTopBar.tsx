'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { HeaderTodayMood } from '@/components/mood/HeaderTodayMood';
import { firstNameFrom } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface CommunityTopBarProps {
  className?: string;
}

export function CommunityTopBar({ className }: CommunityTopBarProps) {
  const { selectedProfile, user } = useAuthStore();
  const displayName = selectedProfile?.name || user?.name || 'there';

  return (
    <AppPageHeader
      className={cn(className)}
      title={<span className="text-primary">{firstNameFrom(displayName)}</span>}
      subtitle={<HeaderTodayMood profileId={selectedProfile?._id} />}
      subtitleTone="plain"
    />
  );
}
