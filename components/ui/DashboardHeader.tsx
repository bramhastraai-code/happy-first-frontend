'use client';

import type { ReactNode } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { NotificationBell } from '@/components/feed/NotificationBell';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { HeaderIconButton } from '@/components/ui/HeaderIconAction';
import { firstNameFrom, getTimeGreeting } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  subtitle?: string;
  isActive?: boolean;
  isPaused?: boolean;
  onOpenMessages?: () => void;
  onOpenMessageFromNotification?: (conversationId: string) => void;
  className?: string;
  extraActions?: ReactNode;
}

export function DashboardHeader({
  subtitle,
  isActive = true,
  isPaused = false,
  onOpenMessages,
  onOpenMessageFromNotification,
  className,
  extraActions,
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
      subtitle={subtitle}
      title={
        <>
          {getTimeGreeting()},{' '}
          <span className="text-primary">{firstNameFrom(displayName)}</span>
        </>
      }
      meta={
        <>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs',
              isPaused
                ? 'bg-amber-100 text-amber-800'
                : isActive
                  ? 'bg-success-soft text-success'
                  : 'bg-secondary text-muted-foreground'
            )}
          >
            {isPaused ? 'Plan paused' : isActive ? 'Active' : 'Inactive'}
          </span>
          {!isMainProfile && user?.name ? (
            <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Managed by {firstNameFrom(user.name)}
            </span>
          ) : null}
        </>
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
