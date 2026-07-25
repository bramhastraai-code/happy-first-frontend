'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Heart, MessageCircle, MessageSquare } from 'lucide-react';
import { DateTime } from 'luxon';
import { notificationsAPI, type AppNotification } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  onOpenMessage?: (conversationId: string) => void;
  onOpenPost?: (photoId: string) => void;
}

function iconFor(type: AppNotification['type']) {
  if (type === 'like') return Heart;
  if (type === 'comment') return MessageCircle;
  return MessageSquare;
}

export function NotificationBell({ onOpenMessage, onOpenPost }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationsAPI.list();
      return res.data.data;
    },
    refetchInterval: 60_000,
  });

  const unread = data?.unread ?? 0;
  const notifications = data?.notifications ?? [];

  const markAll = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsAPI.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[120] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </p>
            ) : (
              notifications.map((item) => {
                const Icon = iconFor(item.type);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!item.readAt) markOne.mutate(item.id);
                      if (item.type === 'message' && item.conversationId) {
                        onOpenMessage?.(item.conversationId);
                        setOpen(false);
                      } else if (item.photoId) {
                        onOpenPost?.(item.photoId);
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      'flex w-full gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-secondary/60',
                      !item.readAt && 'bg-primary-soft/40'
                    )}
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {item.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {DateTime.fromISO(item.createdAt).toRelative()}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
