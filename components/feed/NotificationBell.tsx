'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  ChevronLeft,
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
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  onOpenMessage?: (conversationId: string) => void;
  onOpenPost?: (photoId: string) => void;
  triggerClassName?: string;
  /** Visible caption under the bell (matches header icon actions). */
  caption?: string;
}

function iconFor(type: AppNotification['type']) {
  if (type === 'like' || type === 'community_appreciation') return Heart;
  if (type === 'comment' || type === 'community_mention' || type === 'community_reply') {
    return MessageCircle;
  }
  if (type === 'follow' || type === 'post_collaboration' || type === 'community_invite' || type === 'community_join_request') {
    return UserPlus;
  }
  if (
    type === 'community_announcement' ||
    type === 'community_week_summary' ||
    type === 'community_nudge' ||
    type === 'community_event' ||
    type === 'community_event_reminder'
  ) {
    return Megaphone;
  }
  if (type === 'message') return MessageSquare;
  return Heart;
}

function groupLabel(iso: string) {
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return 'Earlier';
  const now = DateTime.now();
  if (dt.hasSame(now, 'day')) return 'Today';
  if (dt.hasSame(now.minus({ days: 1 }), 'day')) return 'Yesterday';
  if (dt > now.minus({ days: 7 })) return 'This week';
  return 'Earlier';
}

function groupNotifications(items: AppNotification[]) {
  const buckets = new Map<string, AppNotification[]>();
  for (const item of items) {
    const label = groupLabel(item.createdAt);
    const list = buckets.get(label) ?? [];
    list.push(item);
    buckets.set(label, list);
  }
  return (['Today', 'Yesterday', 'This week', 'Earlier'] as const)
    .map((label) => ({ label, items: buckets.get(label) ?? [] }))
    .filter((group) => group.items.length > 0);
}

const COMMUNITY_TYPES = new Set<AppNotification['type']>([
  'community_announcement',
  'community_week_summary',
  'community_nudge',
  'community_event',
  'community_event_reminder',
  'community_appreciation',
  'community_mention',
  'community_reply',
  'community_invite',
  'community_join_request',
]);

function notificationHref(item: AppNotification): string | null {
  if (item.type === 'community_invite' && item.communityId) {
    return `/community/join/${item.communityId}`;
  }
  if (item.type === 'community_join_request' && item.communityId) {
    return `/community/${item.communityId}?tab=members`;
  }
  if (COMMUNITY_TYPES.has(item.type) && item.communityId) {
    return `/community/${item.communityId}`;
  }
  if (item.type === 'message' && item.conversationId) {
    return `/feed?dm=${item.conversationId}`;
  }
  if (item.type === 'follow' && item.actor.profileId) {
    return `/feed/profile/${item.actor.profileId}`;
  }
  if (item.photoId) {
    return `/feed?post=${item.photoId}`;
  }
  if (item.actor.profileId) {
    return `/feed/profile/${item.actor.profileId}`;
  }
  return '/feed';
}

function isPendingSparkInvite(item: AppNotification) {
  if (item.type !== 'post_collaboration' || !item.photoId) return false;
  const title = item.title.toLowerCase();
  if (
    title.includes('accepted your spark') ||
    title.includes('declined your spark') ||
    title.includes('removed you') ||
    title.includes('left your spark')
  ) {
    return false;
  }
  return /invited/i.test(item.title);
}

function apiErrorMessage(error: unknown) {
  const fromApi = (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;
  if (fromApi) return fromApi;
  if (error instanceof Error && error.message) return error.message;
  return 'Could not update this Spark invite.';
}

export function NotificationBell({
  onOpenMessage,
  onOpenPost,
  triggerClassName,
  caption,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sparkDone, setSparkDone] = useState<Record<string, 'accept' | 'decline'>>({});
  const [sparkError, setSparkError] = useState<{ id: string; message: string } | null>(null);
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
      setSparkDone((prev) => ({ ...prev, [variables.notificationId]: variables.action }));
      setSparkError(null);
      void notificationsAPI.markRead(variables.notificationId);
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['feedPost'] });
      void queryClient.invalidateQueries({ queryKey: ['profilePosts'] });
      void queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
      if (variables.action === 'accept') {
        router.push(`/feed?post=${encodeURIComponent(variables.photoId)}`);
        setOpen(false);
      }
    },
    onError: (error, variables) => {
      setSparkError({ id: variables.notificationId, message: apiErrorMessage(error) });
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, queryClient]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const grouped = useMemo(() => groupNotifications(notifications), [notifications]);

  const openActorProfile = (item: AppNotification) => {
    if (!item.readAt) markOne.mutate(item.id);
    if (item.actor.profileId) {
      router.push(`/feed/profile/${item.actor.profileId}`);
      setOpen(false);
    }
  };

  const openNotification = (item: AppNotification) => {
    if (!item.readAt) markOne.mutate(item.id);
    if (item.type === 'message' && item.conversationId && onOpenMessage) {
      onOpenMessage(item.conversationId);
      setOpen(false);
      return;
    }
    if (item.photoId && onOpenPost) {
      onOpenPost(item.photoId);
    }
    const href = notificationHref(item);
    if (href) router.push(href);
    setOpen(false);
  };

  const respondToSpark = (
    event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>,
    item: AppNotification,
    action: 'accept' | 'decline'
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!item.photoId || collabMutation.isPending) return;
    setSparkError(null);
    if (!item.readAt) markOne.mutate(item.id);
    collabMutation.mutate({
      photoId: item.photoId,
      action,
      notificationId: item.id,
    });
  };

  const panel =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 z-[119] bg-black/40 md:bg-black/20"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Notifications"
              className={cn(
                'fixed z-[120] flex flex-col bg-background',
                'inset-0',
                'md:inset-auto md:right-4 md:top-[calc(4.5rem+env(safe-area-inset-top,0px))] md:h-[min(82dvh,40rem)] md:w-[24rem] md:overflow-hidden md:rounded-2xl md:shadow-[var(--shadow-float)]'
              )}
            >
              <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-3 md:pt-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-secondary"
                  aria-label="Close"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <h2 className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight text-foreground">
                  Notifications
                </h2>
                {unread > 0 ? (
                  <button
                    type="button"
                    onClick={() => markAll.mutate()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[13px] font-semibold text-primary"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Read all
                  </button>
                ) : null}
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center px-6 py-16 text-center">
                    <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Bell className="h-6 w-6" />
                    </span>
                    <p className="text-[15px] font-semibold text-foreground">
                      No notifications yet
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Likes, comments, and follows will show up here.
                    </p>
                    <Link
                      href="/feed/explore"
                      onClick={() => setOpen(false)}
                      className="mt-5 text-sm font-semibold text-primary"
                    >
                      Find people to follow
                    </Link>
                  </div>
                ) : (
                  grouped.map((group) => (
                    <section key={group.label}>
                      <h3 className="px-4 pb-1 pt-3 text-[15px] font-semibold text-foreground">
                        {group.label}
                      </h3>
                      {group.items.map((item) => {
                        const Icon = iconFor(item.type);
                        const timeLabel = DateTime.fromISO(item.createdAt).toRelative({
                          style: 'narrow',
                        });
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'flex w-full items-start gap-3 px-4 py-2.5',
                              !item.readAt && 'bg-primary/[0.04]'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => openActorProfile(item)}
                              className="relative shrink-0"
                              aria-label={`View ${item.actor.name}`}
                            >
                              <ProfileAvatar
                                name={item.actor.name}
                                avatarUrl={item.actor.avatarUrl}
                                avatarSeed={item.actor.avatarSeed}
                                avatarStyle={item.actor.avatarStyle}
                                size="md"
                                className="h-11 w-11"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                                <Icon className="h-2.5 w-2.5" strokeWidth={2.75} />
                              </span>
                            </button>
                            <div className="min-w-0 flex-1 py-0.5">
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => openNotification(item)}
                              >
                                <p className="line-clamp-2 text-[13.5px] leading-snug text-foreground">
                                  <span className="font-semibold">{item.title}</span>
                                  {item.body ? (
                                    <span className="font-normal text-muted-foreground">
                                      {' '}
                                      {item.body}
                                    </span>
                                  ) : null}
                                  {timeLabel ? (
                                    <span className="whitespace-nowrap font-normal text-muted-foreground">
                                      {' '}
                                      {timeLabel.replace(/\s*ago$/i, '')}
                                    </span>
                                  ) : null}
                                </p>
                              </button>
                              {isPendingSparkInvite(item) && !sparkDone[item.id] ? (
                                <div className="relative z-10 mt-2 flex flex-col gap-1.5">
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={collabMutation.isPending}
                                      className="touch-manipulation rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => respondToSpark(event, item, 'accept')}
                                    >
                                      {collabMutation.isPending &&
                                      collabMutation.variables?.notificationId === item.id &&
                                      collabMutation.variables?.action === 'accept'
                                        ? 'Accepting…'
                                        : 'Accept'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={collabMutation.isPending}
                                      className="touch-manipulation rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60"
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onClick={(event) => respondToSpark(event, item, 'decline')}
                                    >
                                      {collabMutation.isPending &&
                                      collabMutation.variables?.notificationId === item.id &&
                                      collabMutation.variables?.action === 'decline'
                                        ? 'Declining…'
                                        : 'Decline'}
                                    </button>
                                  </div>
                                  {sparkError?.id === item.id ? (
                                    <p className="text-[11px] font-medium text-destructive">
                                      {sparkError.message}
                                    </p>
                                  ) : null}
                                </div>
                              ) : sparkDone[item.id] === 'accept' ? (
                                <p className="mt-1.5 text-[11px] font-medium text-primary">
                                  Spark accepted
                                </p>
                              ) : sparkDone[item.id] === 'decline' ? (
                                <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                                  Invite declined
                                </p>
                              ) : null}
                            </div>
                            {!item.readAt ? (
                              <span
                                className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                                aria-hidden
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </section>
                  ))
                )}
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  const captioned =
    'relative inline-flex shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 min-w-[3.25rem] min-h-11';

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          caption
            ? captioned
            : triggerClassName ||
                'relative inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-foreground/80 transition-colors hover:text-primary',
          open && 'text-primary'
        )}
        aria-label={caption || 'Notifications'}
        title={caption || 'Notifications'}
        aria-expanded={open}
      >
        <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
          <Bell className="h-[1.15rem] w-[1.15rem] stroke-[2.25]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm ring-2 ring-surface">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </span>
        {caption ? (
          <span className="max-w-[4.5rem] truncate text-[9px] font-semibold leading-tight sm:text-[10px]">
            {caption}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
