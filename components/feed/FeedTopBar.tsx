'use client';

import { MessageCircle, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { NotificationBell } from '@/components/feed/NotificationBell';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { HeaderIconButton, HeaderIconLink } from '@/components/ui/HeaderIconAction';
import { HeaderTodayMood } from '@/components/mood/HeaderTodayMood';
import { firstNameFrom } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface FeedTopBarProps {
  onOpenMessages: () => void;
  onOpenMessageFromNotification?: (conversationId: string) => void;
  onOpenPost?: (photoId: string) => void;
  className?: string;
  flush?: boolean;
}

export function FeedTopBar({
  onOpenMessages,
  onOpenMessageFromNotification,
  onOpenPost,
  className,
  flush,
}: FeedTopBarProps) {
  const { selectedProfile, user } = useAuthStore();
  const displayName = selectedProfile?.name || user?.name || 'there';

  return (
    <AppPageHeader
      className={cn(className)}
      flush={flush}
      title={<span className="text-primary">{firstNameFrom(displayName)}</span>}
      subtitle={<HeaderTodayMood profileId={selectedProfile?._id} />}
      subtitleTone="plain"
      actions={
        <>
          <HeaderIconLink
            href="/feed/explore"
            icon={<Search className="h-[18px] w-[18px]" />}
            caption="Search"
          />
          <NotificationBell
            onOpenMessage={onOpenMessageFromNotification}
            onOpenPost={onOpenPost}
            caption="Alerts"
          />
          <HeaderIconButton
            icon={<MessageCircle className="h-[18px] w-[18px]" />}
            caption="Messages"
            onClick={onOpenMessages}
          />
        </>
      }
    />
  );
}
