'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Loader2, Plus, ScanLine, Search, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { CommunityTopBar } from '@/components/community/CommunityTopBar';
import { CommunityJoinScanner } from '@/components/community/CommunityJoinScanner';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { Button } from '@/components/ui/button';
import { communityAPI, type Community } from '@/lib/api/community';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { cn } from '@/lib/utils';

const CATEGORY_FILTERS = ['All', 'Body', 'Mind', 'Soul'] as const;

function categoryLabel(community: Community) {
  if (!community.categories?.length) return 'Mixed';
  return community.categories
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
    .join(' · ');
}

function activityPreview(community: Community) {
  return community.activities.map((a) => a.name).slice(0, 3).join(', ');
}

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('discover');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('All');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

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

  const mineQuery = useQuery({
    queryKey: ['communities', 'mine'],
    enabled: activeTab === 'my-communities',
    queryFn: async () => {
      const res = await communityAPI.mine();
      return res.data.data.communities ?? [];
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => communityAPI.join(id),
    onMutate: (id) => setJoiningId(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
    onSettled: () => setJoiningId(null),
  });

  const communities = discoverQuery.data ?? [];
  const myCommunities = mineQuery.data ?? [];

  const filtered = useMemo(() => {
    if (category === 'All') return communities;
    const cat = category.toLowerCase();
    return communities.filter((c) =>
      (c.categories || []).some((item) => item.toLowerCase() === cat)
    );
  }, [communities, category]);

  const totalMembers = filtered.reduce((sum, c) => sum + (c.memberCount || 0), 0);

  return (
    <MainLayout>
      <CommunityTopBar />

      <div className="community-header mt-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <ChipTabs
            className="community-tabs flex-1"
            tabs={[
              { id: 'discover', label: 'Discover' },
              { id: 'my-communities', label: 'My groups' },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine className="h-4 w-4" />
              Scan
            </Button>
            <Button asChild size="sm" className="shrink-0">
              <Link href="/community/create">
                <Plus className="h-4 w-4" />
                Create
              </Link>
            </Button>
          </div>
        </div>

        {activeTab === 'discover' ? (
          <>
            <div className="app-card p-4">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <p className="text-xs font-medium text-muted-foreground">Active groups</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {filtered.length}
                  </p>
                </div>
                <div className="pl-4">
                  <p className="text-xs font-medium text-muted-foreground">Total members</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {totalMembers.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

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

            <section aria-label="Communities" className="trending-communities">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title">Communities</h2>
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
                            {community.description || activityPreview(community) || 'Wellness group'}
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
          </>
        ) : (
          <section aria-label="My communities" className="my-communities">
            {mineQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : myCommunities.length > 0 ? (
              <ul className="section-card divide-y divide-border">
                {myCommunities.map((community) => (
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
                          {community.status === 'deleted'
                            ? 'Deleted · history available'
                            : community.myRole === 'admin'
                              ? 'Admin'
                              : community.myRole === 'moderator'
                                ? 'Moderator'
                                : 'Member'}{' '}
                          {community.status !== 'deleted'
                            ? `· ${community.memberCount} members`
                            : null}
                        </p>
                      </div>
                      {community.status === 'deleted' ? (
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Deleted
                        </span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="section-card p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold text-foreground">No groups yet</h2>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Join a community from Discover or create your own group.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => setActiveTab('discover')}>
                    Browse communities
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button asChild>
                    <Link href="/community/create">
                      <Plus className="h-4 w-4" />
                      Create
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <CommunityJoinScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </MainLayout>
  );
}
