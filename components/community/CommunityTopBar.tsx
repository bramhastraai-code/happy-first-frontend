'use client';

import { Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { HeaderIconLink } from '@/components/ui/HeaderIconAction';
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
      actions={
        <HeaderIconLink
          href="/community/create"
          className="community-create-btn"
          icon={<Plus className="h-[18px] w-[18px]" />}
          caption="Create"
        />
      }
    />
  );
}
