'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Rss,
  Search,
  UserSearch,
  Users,
  X,
} from 'lucide-react';
import { followAPI } from '@/lib/api/follow';
import { communityAPI, type CommunityEvent } from '@/lib/api/community';
import { fetchCurrentPlan } from '@/lib/queries/fetchers';
import { queryKeys, STALE } from '@/lib/queries/keys';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';
import {
  todayInProfileZone,
} from '@/lib/utils/profileTime';

const QUICK_LINKS = [
  { name: 'Feed', href: '/feed', icon: Rss },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Events', href: '/community', icon: CalendarDays },
  { name: 'Find people', href: '/feed/explore', icon: UserSearch },
];

type EventWithCommunity = CommunityEvent & { communityName: string };

function SectionHeader({ title, seeAllHref }: { title: string; seeAllHref?: string }) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {seeAllHref && (
        <Link href={seeAllHref} className="text-[11px] font-semibold text-primary hover:underline">
          See all
        </Link>
      )}
    </div>
  );
}

export function GlobalSearch() {
  const { selectedProfile } = useAuthStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const searching = debounced.length >= 1;
  const q = debounced.toLowerCase();

  const peopleQuery = useQuery({
    queryKey: ['globalSearch', 'people', debounced],
    enabled: open && searching,
    queryFn: async () => {
      const res = await followAPI.searchUsers(debounced, 6);
      return res.data.data.people;
    },
  });

  const communitiesQuery = useQuery({
    queryKey: ['globalSearch', 'communities', debounced],
    enabled: open && searching,
    queryFn: async () => {
      const res = await communityAPI.list({ q: debounced });
      return res.data.data.communities;
    },
  });

  // No global events endpoint exists, so gather upcoming events from my communities once.
  const eventsQuery = useQuery({
    queryKey: ['globalSearch', 'events', selectedProfile?._id],
    enabled: open && searching,
    staleTime: STALE.dashboard,
    queryFn: async (): Promise<EventWithCommunity[]> => {
      const mine = await communityAPI.mine();
      const communities = (mine.data.data.communities ?? []).slice(0, 8);
      const perCommunity = await Promise.all(
        communities.map(async (community) => {
          try {
            const res = await communityAPI.upcomingEvents(community.id, 10);
            return (res.data.data.events ?? []).map((event) => ({
              ...event,
              communityName: community.name,
            }));
          } catch {
            return [];
          }
        })
      );
      return perCommunity.flat();
    },
  });

  const localDate = todayInProfileZone(selectedProfile?.timezone);
  const planQuery = useQuery({
    queryKey: queryKeys.weeklyPlan.current(localDate, selectedProfile?._id),
    enabled: open && searching,
    staleTime: STALE.dashboard,
    queryFn: () => fetchCurrentPlan(localDate),
  });

  const people = (peopleQuery.data ?? []).slice(0, 5);
  const communities = (communitiesQuery.data ?? []).slice(0, 5);

  const events = useMemo(() => {
    if (!searching) return [];
    return (eventsQuery.data ?? [])
      .filter((event) =>
        [event.title, event.description, event.location, event.communityName].some((text) =>
          (text || '').toLowerCase().includes(q)
        )
      )
      .slice(0, 5);
  }, [eventsQuery.data, q, searching]);

  const tasks = useMemo(() => {
    if (!searching) return [];
    return (planQuery.data?.activities ?? [])
      .filter((activity) => (activity.label || '').toLowerCase().includes(q))
      .slice(0, 5);
  }, [planQuery.data, q, searching]);

  const matchedQuickLinks = useMemo(() => {
    if (!searching) return QUICK_LINKS;
    return QUICK_LINKS.filter((link) => link.name.toLowerCase().includes(q));
  }, [q, searching]);

  const isLoading =
    searching &&
    (peopleQuery.isLoading || communitiesQuery.isLoading || eventsQuery.isLoading || planQuery.isLoading);

  const hasResults =
    people.length > 0 || communities.length > 0 || events.length > 0 || tasks.length > 0;

  const close = () => setOpen(false);

  const rowClass =
    'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-secondary';

  return (
    <div ref={containerRef} className="home-search relative space-y-2">
      <div className="flex items-center gap-2">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search people, communities, events, tasks…"
            className={cn(
              'h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-sm text-foreground shadow-sm',
              'placeholder:text-muted-foreground outline-none',
              'focus:border-primary/40 focus:ring-2 focus:ring-primary/20'
            )}
            inputMode="search"
            aria-label="Global search"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDebounced('');
              }}
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <Link
          href="/feed/explore"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 active:scale-[0.98]"
          aria-label="Find people"
        >
          <UserSearch className="h-4 w-4" />
          <span>People</span>
        </Link>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-float)]">
          {matchedQuickLinks.length > 0 && (
            <>
              <SectionHeader title="Go to" />
              <div className={cn('grid gap-1.5', searching ? 'grid-cols-1' : 'grid-cols-2')}>
                {matchedQuickLinks.map((link) => {
                  const isFindPeople = link.href === '/feed/explore';
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={close}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                        isFindPeople
                          ? 'border-primary/40 bg-primary-soft text-primary ring-1 ring-primary/20 hover:bg-primary/15'
                          : 'border-border/60 bg-background/40 text-foreground hover:bg-secondary'
                      )}
                    >
                      <link.icon
                        className={cn('h-4 w-4', isFindPeople ? 'text-primary' : 'text-primary')}
                      />
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {searching && (
            <>
              {isLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}

              {people.length > 0 && (
                <>
                  <SectionHeader title="People" seeAllHref="/feed/explore" />
                  <ul>
                    {people.map((person) => (
                      <li key={person.profileId}>
                        <Link
                          href={`/feed/profile/${person.profileId}`}
                          onClick={close}
                          className={rowClass}
                        >
                          <ProfileAvatar
                            name={person.name}
                            avatarUrl={person.avatarUrl}
                            avatarSeed={person.avatarSeed}
                            avatarStyle={person.avatarStyle}
                            size="md"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {person.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {person.city || (person.followsYou ? 'Follows you' : 'View profile')}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {communities.length > 0 && (
                <>
                  <SectionHeader title="Communities" seeAllHref="/community" />
                  <ul>
                    {communities.map((community) => (
                      <li key={community.id}>
                        <Link
                          href={`/community/${community.id}`}
                          onClick={close}
                          className={rowClass}
                        >
                          <ProfileAvatar
                            name={community.name}
                            avatarUrl={community.avatarUrl}
                            avatarSeed={community.avatarSeed}
                            avatarStyle={community.avatarStyle}
                            size="md"
                            rounded="xl"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {community.name}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {community.memberCount}{' '}
                              {community.memberCount === 1 ? 'member' : 'members'}
                              {community.isMember ? ' · Joined' : ''}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {events.length > 0 && (
                <>
                  <SectionHeader title="Events" />
                  <ul>
                    {events.map((event) => (
                      <li key={event.id}>
                        <Link
                          href={`/community/${event.communityId}`}
                          onClick={close}
                          className={rowClass}
                        >
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                            <CalendarDays className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {event.title}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {event.communityName} ·{' '}
                              {DateTime.fromISO(event.startsAt).toFormat('EEE, MMM d · t')}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {tasks.length > 0 && (
                <>
                  <SectionHeader title="My tasks" seeAllHref="/tasks" />
                  <ul>
                    {tasks.map((task) => (
                      <li key={task.activity}>
                        <Link href="/tasks" onClick={close} className={rowClass}>
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                            <ClipboardList className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {task.label || 'Activity'}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {task.targetValue} {task.unit} · {task.cadence}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {!isLoading && !hasResults && matchedQuickLinks.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{debounced}&rdquo;
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
