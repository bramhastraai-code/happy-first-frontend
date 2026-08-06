'use client';

import Link from 'next/link';
import { MessageCircle, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { NotificationBell } from '@/components/feed/NotificationBell';
import {
  AppPageHeader,
  headerActionBtnClass,
} from '@/components/ui/AppPageHeader';
import { firstNameFrom } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface FeedTopBarProps {
  onOpenMessages: () => void;
  onOpenMessageFromNotification?: (conversationId: string) => void;
  onOpenPost?: (photoId: string) => void;
  className?: string;
}

export function FeedTopBar({
  onOpenMessages,
  onOpenMessageFromNotification,
  onOpenPost,
  className,
}: FeedTopBarProps) {
  const { selectedProfile, user } = useAuthStore();
  const displayName = selectedProfile?.name || user?.name || 'there';
  const profileHref = selectedProfile?._id
    ? `/feed/profile/${selectedProfile._id}`
    : undefined;

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
        <>
          <Link
            href="/feed/explore"
            className={headerActionBtnClass}
            aria-label="Search people and posts"
            title="Search"
          >
            <Search className="h-[18px] w-[18px]" />
          </Link>
          <NotificationBell
            onOpenMessage={onOpenMessageFromNotification}
            onOpenPost={onOpenPost}
            triggerClassName={headerActionBtnClass}
          />
          <button
            type="button"
            onClick={onOpenMessages}
            className={headerActionBtnClass}
            aria-label="Messages"
            title="Messages"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
          </button>
        </>
      }
    />
  );
}
