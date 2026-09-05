'use client';

import type { ReactNode } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { NotificationBell } from '@/components/feed/NotificationBell';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { HeaderIconButton } from '@/components/ui/HeaderIconAction';
import { firstNameFrom } from '@/lib/utils/greeting';

interface DashboardHeaderProps {
  isPaused?: boolean;
  onOpenMessages?: () => void;
  onOpenMessageFromNotification?: (conversationId: string) => void;
  className?: string;
  extraActions?: ReactNode;
  /** Level label shown next to the name, e.g. "Lv 4 · Builder" */
  levelLabel?: string | null;
}

export function DashboardHeader({
  isPaused = false,
  onOpenMessages,
  onOpenMessageFromNotification,
  className,
  extraActions,
  levelLabel = null,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { user, selectedProfile, profiles, setProfileSelectedInSession } = useAuthStore();

  const displayName = selectedProfile?.name || user?.name || 'there';
  const isMainProfile = !selectedProfile || selectedProfile.relationship === 'self';
  const canSwitchProfile = profiles && profiles.length > 1;

  const handleSwitchProfile = () => {
    setProfileSelectedInSession(false);
    router.push('/select-profile');
  };

  return (
    <AppPageHeader
      className={className}
      showAvatar
      title={
        <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-primary">{firstNameFrom(displayName)}</span>
          {levelLabel ? (
            <button
              type="button"
              onClick={() => router.push('/xp')}
              className="text-xs font-semibold tabular-nums text-muted-foreground transition-colors hover:text-primary sm:text-sm"
            >
              {levelLabel}
            </button>
          ) : null}
        </span>
      }
      subtitle={new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })}
      subtitleTone="plain"
      meta={
        isPaused || (!isMainProfile && user?.name) ? (
          <>
            {isPaused ? (
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 sm:text-xs">
                Plan paused
              </span>
            ) : null}
            {!isMainProfile && user?.name ? (
              <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Managed by {firstNameFrom(user.name)}
              </span>
            ) : null}
          </>
        ) : undefined
      }
      actions={
        <>
          {extraActions}

          {canSwitchProfile ? (
            <HeaderIconButton
              icon={<RefreshCw className="h-4 w-4" />}
              caption="Switch"
              onClick={handleSwitchProfile}
            />
          ) : null}

          <NotificationBell
            onOpenMessage={onOpenMessageFromNotification}
            caption="Alerts"
          />

          {onOpenMessages ? (
            <HeaderIconButton
              icon={<MessageCircle className="h-[18px] w-[18px]" />}
              caption="Chat"
              onClick={onOpenMessages}
            />
          ) : null}
        </>
      }
    />
  );
}
