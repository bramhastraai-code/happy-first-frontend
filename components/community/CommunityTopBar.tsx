'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { firstNameFrom } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface CommunityTopBarProps {
  className?: string;
}

export function CommunityTopBar({ className }: CommunityTopBarProps) {
  const { selectedProfile, user } = useAuthStore();
  const displayName = selectedProfile?.name || user?.name || 'there';

  const profileHref = selectedProfile?._id
    ? `/feed/profile/${selectedProfile._id}`
    : null;

  return (
    <AppPageHeader
      className={cn(className)}
      title={<span className="text-primary">{firstNameFrom(displayName)}</span>}
      subtitle={new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })}
      subtitleTone="label"
      avatarHref={profileHref}
    />
  );
}
