'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Compass,
  Heart,
  Megaphone,
  MessageCircle,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { DateTime } from 'luxon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notificationsAPI, type AppNotification } from '@/lib/api/notifications';
import { feedAPI } from '@/lib/api/feed';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  onOpenMessage?: (conversationId: string) => void;
  onOpenPost?: (photoId: string) => void;
  triggerClassName?: string;
}

function iconFor(type: AppNotification['type']) {
  if (type === 'like') return Heart;
  if (type === 'comment') return MessageCircle;
  if (type === 'follow') return UserPlus;
  if (type === 'post_collaboration') return UserPlus;
  if (type === 'community_announcement') return Megaphone;
  if (type === 'community_week_summary') return Megaphone;
  if (type === 'community_nudge') return Megaphone;
  if (type === 'community_event' || type === 'community_event_reminder') return Megaphone;
  if (type === 'community_appreciation') return Heart;
  if (type === 'community_mention' || type === 'community_reply') return MessageCircle;
  return MessageSquare;
}

export function NotificationBell({
  onOpenMessage,
  onOpenPost,
  triggerClassName,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

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

  const collabMutation = useMutation({
    mutationFn: ({
      photoId,
      action,
    }: {
      photoId: string;
      action: 'accept' | 'decline';
      notificationId: string;
    }) => feedAPI.respondToCollaboration(photoId, action),
    onSuccess: (_data, variables) => {
      void notificationsAPI.markRead(variables.notificationId);
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profilePosts'] });
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [open, queryClient]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openActorProfile = (item: AppNotification) => {
    if (!item.readAt) markOne.mutate(item.id);
    if (item.actor.profileId) {
      router.push(`/feed/profile/${item.actor.profileId}`);
      setOpen(false);
    }
  };

  const panel =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 z-[119] bg-black/25 md:bg-transparent"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Notifications"
              className={cn(
                'fixed z-[120] flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)]',
                'left-3 right-3 top-[calc(4.25rem+env(safe-area-inset-top,0px))] max-h-[min(70dvh,28rem)]',
                'md:left-auto md:right-4 md:top-[calc(4.75rem+env(safe-area-inset-top,0px))] md:w-[22rem]'
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <div className="flex min-w-0 shrink-0 items-center gap-2">
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={() => markAll.mutate()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Read all
                    </button>
                  )}
                  <Link
                    href="/feed/explore"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    Explore
                  </Link>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                    <Link
                      href="/feed/explore"
                      onClick={() => setOpen(false)}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                    >
                      <Compass className="h-4 w-4" />
                      Explore people
                    </Link>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const Icon = iconFor(item.type);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex w-full gap-3 border-b border-border px-3 py-3 transition-colors hover:bg-secondary/60',
                          !item.readAt && 'bg-primary-soft/40'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => openActorProfile(item)}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
                          aria-label={`View ${item.actor.name}`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              if (!item.readAt) markOne.mutate(item.id);
                              if (
                                (item.type === 'community_announcement' ||
                                  item.type === 'community_week_summary' ||
                                  item.type === 'community_nudge' ||
                                  item.type === 'community_event' ||
                                  item.type === 'community_event_reminder' ||
                                  item.type === 'community_appreciation' ||
                                  item.type === 'community_mention' ||
                                  item.type === 'community_reply') &&
                                item.communityId
                              ) {
                                router.push(`/community/${item.communityId}`);
                                setOpen(false);
                                return;
                              }
                              if (item.type === 'message' && item.conversationId) {
                                onOpenMessage?.(item.conversationId);
                                setOpen(false);
                                return;
                              }
                              if (item.type === 'follow' && item.actor.profileId) {
                                router.push(`/feed/profile/${item.actor.profileId}`);
                                setOpen(false);
                                return;
                              }
                              if (item.photoId) {
                                onOpenPost?.(item.photoId);
                                setOpen(false);
                                return;
                              }
                              if (item.actor.profileId) {
                                router.push(`/feed/profile/${item.actor.profileId}`);
                                setOpen(false);
                              }
                            }}
                          >
                            <p className="text-sm font-medium text-foreground">{item.title}</p>
                            {item.body && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {item.body}
                              </p>
                            )}
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {DateTime.fromISO(item.createdAt).toRelative()}
                              {item.actor.profileId ? ' · View profile' : ''}
                            </p>
                          </button>
                          {item.type === 'post_collaboration' &&
                          item.photoId &&
                          item.title.toLowerCase().includes('invited') ? (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                disabled={collabMutation.isPending}
                                onClick={() => {
                                  if (!item.readAt) markOne.mutate(item.id);
                                  collabMutation.mutate({
                                    photoId: item.photoId!,
                                    action: 'accept',
                                    notificationId: item.id,
                                  });
                                }}
                                className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                disabled={collabMutation.isPending}
                                onClick={() => {
                                  if (!item.readAt) markOne.mutate(item.id);
                                  collabMutation.mutate({
                                    photoId: item.photoId!,
                                    action: 'decline',
                                    notificationId: item.id,
                                  });
                                }}
                                className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground"
                              >
                                Decline
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {notifications.length > 0 ? (
                <div className="border-t border-border px-3 py-2.5">
                  <Link
                    href="/feed/explore"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-foreground hover:bg-secondary/80"
                  >
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    Explore more people
                  </Link>
                </div>
              ) : null}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          triggerClassName ||
            'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary',
          open && 'bg-primary/10 text-primary'
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-[1.15rem] w-[1.15rem] stroke-[2.25]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm ring-2 ring-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
