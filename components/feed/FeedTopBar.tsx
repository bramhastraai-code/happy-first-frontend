'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { BRAND_MARK } from '@/lib/brand';
import { useAuthStore } from '@/lib/store/authStore';
import { NotificationBell } from '@/components/feed/NotificationBell';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
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
  const name = selectedProfile?.name || user?.name || 'You';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 -mx-4 mb-1 flex items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:bg-surface sm:px-4 sm:shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
          {BRAND_MARK}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold tracking-tight text-foreground">Feed</p>
          <p className="truncate text-[11px] text-muted-foreground">Happy First Club</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <NotificationBell
          onOpenMessage={onOpenMessageFromNotification}
          onOpenPost={onOpenPost}
        />
        <button
          type="button"
          onClick={onOpenMessages}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
          aria-label="Messages"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <Link href="/settings" aria-label="Profile settings" title={name}>
          <ProfileAvatar
            name={name}
            avatarUrl={selectedProfile?.avatarUrl}
            avatarSeed={selectedProfile?.avatarSeed}
            avatarStyle={selectedProfile?.avatarStyle}
            size="md"
            className="ring-2 ring-primary/15"
          />
        </Link>
      </div>
    </header>
  );
}
