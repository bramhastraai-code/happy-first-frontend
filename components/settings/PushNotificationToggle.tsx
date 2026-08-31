'use client';

import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

export default function PushNotificationToggle({ embedded = false }: { embedded?: boolean }) {
  const { status, busy, error, subscribe, unsubscribe } = usePushNotifications();

  if (status === 'unsupported') return null;

  const enabled = status === 'subscribed';
  const denied = status === 'denied';
  const disabled = busy || denied || status === 'loading';

  const statusLabel = denied
    ? 'Blocked in browser'
    : enabled
      ? 'Enabled'
      : 'Disabled';

  return (
    <section
      aria-label="Push notifications"
      className={cn(embedded ? 'px-4 py-3.5' : 'section-card px-4 py-3.5 sm:px-5')}
    >
      <div className="flex items-center gap-3">
        {embedded ? (
          <Bell className={cn('h-6 w-6 shrink-0', enabled ? 'text-foreground' : 'text-neutral-400')} strokeWidth={1.75} />
        ) : (
          <span
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              enabled ? 'bg-primary-soft text-primary' : 'bg-secondary text-muted-foreground'
            )}
          >
            {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </span>
        )}
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">Push notifications</span>
          <span className="block text-xs text-muted-foreground">
            Get alerts even when the app is closed
          </span>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn('h-2 w-2 rounded-full', enabled ? 'bg-primary' : 'bg-muted-foreground/40')}
            aria-hidden
          />
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={() => (enabled ? void unsubscribe() : void subscribe())}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors',
            enabled ? 'bg-primary' : 'bg-secondary',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          title={
            denied
              ? 'Notifications are blocked. Allow them in your browser settings.'
              : enabled
                ? 'Disable push notifications'
                : 'Enable push notifications'
          }
        >
          <span
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0'
            )}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : enabled ? (
              <Bell className="h-3.5 w-3.5 text-primary" />
            ) : (
              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        </button>
      </div>
      {denied && (
        <p className="mt-2 text-xs text-muted-foreground">
          Notifications are blocked for this site. Enable them in your browser or device settings,
          then try again.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}
