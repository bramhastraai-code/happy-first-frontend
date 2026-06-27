'use client';

import { LogOut, RefreshCw, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  subtitle?: string;
  isActive?: boolean;
  isPaused?: boolean;
  onLogout?: () => void;
  className?: string;
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({
  subtitle,
  isActive = true,
  isPaused = false,
  onLogout,
  className,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { user, selectedProfile, profiles, setProfileSelectedInSession } = useAuthStore();

  const displayName = selectedProfile?.name || user?.name || 'there';
  const initial = displayName.charAt(0).toUpperCase();
  const isMainProfile = !selectedProfile || selectedProfile.relationship === 'self';
  const canSwitchProfile = profiles && profiles.length > 1;

  const handleSwitchProfile = () => {
    setProfileSelectedInSession(false);
    router.push('/select-profile');
  };

  return (
    <header className={cn('welcome-banner section-card mb-5 overflow-hidden p-3 sm:p-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#c2410c] text-base font-bold text-primary-foreground shadow-sm sm:h-12 sm:w-12 sm:text-lg"
          aria-hidden
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          {subtitle && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
              {subtitle}
            </p>
          )}
          <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-lg">
            {getTimeGreeting()},{' '}
            <span className="text-primary">{displayName.split(' ')[0]}</span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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
            {!isMainProfile && user?.name && (
              <span className="truncate text-[11px] text-muted-foreground sm:text-xs">
                Managed by {user.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        <div className="profile-switcher flex shrink-0 items-center gap-1.5 self-center">
          {canSwitchProfile && (
            <button
              type="button"
              onClick={handleSwitchProfile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2"
              aria-label="Switch profile"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden text-xs font-medium sm:inline">Switch</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-destructive transition-colors hover:bg-red-50"
              aria-label="Log out"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
