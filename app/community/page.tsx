'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Loader2, Plus, ScanLine, Search, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { CommunityTopBar } from '@/components/community/CommunityTopBar';
import { CommunityJoinScanner } from '@/components/community/CommunityJoinScanner';
import { Button } from '@/components/ui/button';
import GuidedTour from '@/components/ui/GuidedTour';
import TourStartButton from '@/components/ui/TourStartButton';
import { UserMascot } from '@/components/ui/UserMascot';
import { communityAPI, type Community } from '@/lib/api/community';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { usePageTour } from '@/lib/hooks/usePageTour';
import { communityTourSteps } from '@/lib/utils/tourSteps';
import { PageFabColumn, pageFabCircleClass } from '@/components/ui/PageFabColumn';
import { cn } from '@/lib/utils';

const CATEGORY_FILTERS = ['All', 'Body', 'Mind', 'Soul'] as const;

type LandingTab = 'mine' | 'events' | 'discover';

function categoryLabel(community: Community) {
  if (!community.categories?.length) return 'Mixed';
  return community.categories
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(' · ');
}

function activityPreview(community: Community) {
  return community.activities.map((a) => a.name).slice(0, 3).join(', ');
}

function roleSubtitle(community: Community) {
  if (community.status === 'deleted') return 'Deleted · history available';
  if (community.status === 'disabled') return 'Disabled';
  if (community.myRole === 'admin') return 'Admin';
  if (community.myRole === 'moderator') return 'Moderator';
  return 'Member';
}

function CommunityListItem({ community }: { community: Community }) {
  return (
    <li key={community.id}>
      <Link
        href={`/community/${community.id}`}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50"
      >
        <CommunityAvatar
          name={community.name}
          icon={community.icon}
          avatarUrl={community.avatarUrl}
          avatarSeed={community.avatarSeed}
          avatarStyle={community.avatarStyle}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{community.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {roleSubtitle(community)}
            {community.status !== 'deleted' && community.status !== 'disabled'
              ? ` · ${community.memberCount} members`
              : null}
          </p>
        </div>
        {community.status === 'deleted' || community.status === 'disabled' ? (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {community.status === 'deleted' ? 'Deleted' : 'Disabled'}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </Link>
    </li>
  );
}

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<LandingTab>('mine');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('All');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const didAutoDiscoverRef = useRef(false);
  const { runTour, isMounted, handleStartTour, handleTourFinish } = usePageTour('tourCompleted:community');

  const discoverQuery = useQuery({
    queryKey: ['communities', 'discover', query, category],
    enabled: activeTab === 'discover',
    queryFn: async () => {
      const res = await communityAPI.list({
        q: query.trim() || undefined,
        category: category === 'All' ? undefined : category,
      });
      return res.data.data.communities ?? [];
    },
  });

  // Always load memberships so we can default to Discover when the user has none
  const mineQuery = useQuery({
    queryKey: ['communities', 'mine'],
    queryFn: async () => {
      const res = await communityAPI.mine();
      return res.data.data.communities ?? [];
    },
  });

  useEffect(() => {
    if (didAutoDiscoverRef.current) return;
    if (mineQuery.isLoading || !mineQuery.isSuccess) return;
    const mine = mineQuery.data ?? [];
    if (mine.length === 0) {
      setActiveTab('discover');
    }
    didAutoDiscoverRef.current = true;
  }, [mineQuery.isLoading, mineQuery.isSuccess, mineQuery.data]);

  const joinMutation = useMutation({
    mutationFn: (id: string) => communityAPI.join(id),
    onMutate: (id) => setJoiningId(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
    onSettled: () => setJoiningId(null),
  });

  const communities = discoverQuery.data ?? [];
  const myCommunitiesAll = mineQuery.data ?? [];

  const myAdminCommunities = useMemo(
    () => myCommunitiesAll.filter((c) => c.myRole === 'admin'),
    [myCommunitiesAll]
  );
  const myMemberGroups = useMemo(
    () =>
      myCommunitiesAll.filter(
        (c) => c.isMember && c.myRole !== 'admin' && c.myRole !== 'moderator'
      ),
    [myCommunitiesAll]
  );
  const myModeratorGroups = useMemo(
    () => myCommunitiesAll.filter((c) => c.isMember && c.myRole === 'moderator'),
    [myCommunitiesAll]
  );

  const filtered = useMemo(() => {
    if (category === 'All') return communities;
    const cat = category.toLowerCase();
    return communities.filter((c) =>
      (c.categories || []).some((item) => item.toLowerCase() === cat)
    );
  }, [communities, category]);

  const memberTotal = myCommunitiesAll.reduce(
    (sum, c) => sum + (c.memberCount || 0),
    0
  );
  const hasAnyMembership = myCommunitiesAll.length > 0;

  function CommunitySection({
    title,
    subtitle,
    items,
    emptyMessage,
  }: {
    title: string;
    subtitle?: string;
    items: Community[];
    emptyMessage?: string;
  }) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {items.length > 0 ? (
          <ul className="section-card divide-y divide-border">
            {items.map((community) => (
              <CommunityListItem key={community.id} community={community} />
            ))}
          </ul>
        ) : emptyMessage ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <MainLayout>
      {isMounted ? (
        <GuidedTour run={runTour} onFinish={handleTourFinish} steps={communityTourSteps} />
      ) : null}
      <div className="community-page-header">
        <CommunityTopBar />
      </div>

      <div className="community-header mt-3 space-y-4">
        <div
          className="community-tabs grid grid-cols-3 gap-1 rounded-2xl border border-border bg-secondary/80 p-1"
          role="tablist"
          aria-label="Community sections"
        >
          {(
            [
              { id: 'mine', label: 'Communities' },
              { id: 'events', label: 'Events' },
              { id: 'discover', label: 'Discover' },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'min-h-10 rounded-xl px-2 text-xs font-semibold transition-colors sm:text-sm',
                  isActive
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'mine' ? (
          <section
            key="mine"
            aria-label="Your Communities"
            className="my-communities space-y-4"
            role="tabpanel"
          >
            <div className="app-card p-4">
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-3 first:pl-0">
                  <p className="text-xs font-medium text-muted-foreground">Admin</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {mineQuery.isLoading ? '—' : myAdminCommunities.length}
                  </p>
                </div>
                <div className="px-3">
                  <p className="text-xs font-medium text-muted-foreground">Groups</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {mineQuery.isLoading
                      ? '—'
                      : myMemberGroups.length + myModeratorGroups.length}
                  </p>
                </div>
                <div className="px-3 last:pr-0">
                  <p className="text-xs font-medium text-muted-foreground">Members</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {mineQuery.isLoading ? '—' : memberTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {mineQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasAnyMembership ? (
              <div className="space-y-6">
                <CommunitySection
                  title="My Communities"
                  subtitle="Where you are admin"
                  items={myAdminCommunities}
                  emptyMessage="You are not an admin of any community yet. Create one or ask to be promoted."
                />
                {myModeratorGroups.length > 0 ? (
                  <CommunitySection
                    title="Moderating"
                    subtitle="Communities you help manage"
                    items={myModeratorGroups}
                  />
                ) : null}
                <CommunitySection
                  title="My Groups"
                  subtitle="Communities where you are a member"
                  items={myMemberGroups}
                  emptyMessage="No member-only groups yet — discover communities to join."
                />
              </div>
            ) : (
              <div className="section-card p-6 text-center">
                <div className="mx-auto mb-3 flex justify-center">
                  <UserMascot size={72} />
                </div>
                <h2 className="text-base font-semibold text-foreground">No communities yet</h2>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Create a community to lead members, or discover groups to join.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => setActiveTab('discover')}>
                    Discover
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button asChild className="community-create-btn">
                    <Link href="/community/create">
                      <Plus className="h-4 w-4" />
                      Create
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === 'events' ? (
          <section
            key="events"
            aria-label="Events"
            className="space-y-4"
            role="tabpanel"
          >
            <div className="section-card p-8 text-center">
              <div className="mx-auto mb-3 flex justify-center">
                <UserMascot size={72} />
              </div>
              <h2 className="text-base font-semibold text-foreground">Events — Coming Soon</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Events and RSVPs coming soon. Use Calendar inside a community for member events
                today.
              </p>
            </div>
          </section>
        ) : null}

        {activeTab === 'discover' ? (
          <div key="discover" className="space-y-4" role="tabpanel" aria-label="Discover">
            <div className="section-card p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search communities…"
                  className="h-10 w-full rounded-xl border border-input bg-secondary pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={cn(
                      'min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors',
                      category === item
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <section aria-label="Discover New Communities" className="trending-communities">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title">Discover New Communities</h2>
                <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
              </div>

              {discoverQuery.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length > 0 ? (
                <ul className="section-card divide-y divide-border">
                  {filtered.map((community) => (
                    <li
                      key={community.id}
                      className="community-card flex items-center gap-3 px-4 py-3.5"
                    >
                      <Link
                        href={`/community/${community.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <CommunityAvatar
                          name={community.name}
                          icon={community.icon}
                          avatarUrl={community.avatarUrl}
                          avatarSeed={community.avatarSeed}
                          avatarStyle={community.avatarStyle}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {community.name}
                          </p>
                          <span className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                            {categoryLabel(community)}
                          </span>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {community.description ||
                              activityPreview(community) ||
                              'Wellness group'}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {community.memberCount} members
                          </p>
                        </div>
                      </Link>
                      {community.isMember ? (
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <Link href={`/community/${community.id}`}>Open</Link>
                        </Button>
                      ) : community.myMembershipStatus === 'pending' ? (
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                          <Link href={`/community/${community.id}`}>Pending</Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="join-button min-h-10 shrink-0 px-4 text-xs"
                          disabled={joiningId === community.id && joinMutation.isPending}
                          onClick={() => joinMutation.mutate(community.id)}
                        >
                          {joiningId === community.id && joinMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            'Request'
                          )}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No communities found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Create the first group or try a different search.
                  </p>
                  <Button asChild variant="outline" className="mt-4">
                    <Link href="/community/create">
                      <Plus className="h-4 w-4" />
                      Create community
                    </Link>
                  </Button>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>

      {isMounted ? (
        <PageFabColumn>
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className={pageFabCircleClass}
            aria-label="Scan community QR"
          >
            <ScanLine className="h-7 w-7" strokeWidth={2.5} />
          </button>
          <Link
            href="/community/create"
            aria-label="Create community"
            className={cn('community-create-btn', pageFabCircleClass)}
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </Link>
          <TourStartButton inline onClick={handleStartTour} />
        </PageFabColumn>
      ) : null}

      <CommunityJoinScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </MainLayout>
  );
}
