'use client';

import MainLayout from '@/components/layout/MainLayout';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Users, Search, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const trendingCommunities = [
  { id: 1, name: 'Yoga Masters', description: 'Daily yoga and mindfulness', members: 256, category: 'Mind', emoji: '🧘' },
  { id: 2, name: 'Stairway to Heaven', description: 'Climb floors, skip the elevator', members: 167, category: 'Body', emoji: '🏢' },
  { id: 3, name: 'Hydration Heroes', description: 'Track water intake together', members: 523, category: 'Body', emoji: '💧' },
  { id: 4, name: 'Night Owls Fitness', description: 'Workouts after sunset', members: 142, category: 'Body', emoji: '🦉' },
  { id: 5, name: 'Morning Readers', description: 'Daily reading habit group', members: 89, category: 'Mind', emoji: '📖' },
  { id: 6, name: 'Gratitude Circle', description: 'Reflect and log happy days', members: 201, category: 'Soul', emoji: '🌱' },
];

const CATEGORY_FILTERS = ['All', 'Body', 'Mind', 'Soul'] as const;

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('discover');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('All');

  const filtered = useMemo(() => {
    return trendingCommunities.filter((community) => {
      const matchesCategory = category === 'All' || community.category === category;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        community.name.toLowerCase().includes(q) ||
        community.description.toLowerCase().includes(q) ||
        community.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const totalMembers = trendingCommunities.reduce((sum, c) => sum + c.members, 0);

  return (
    <MainLayout>
      <PageHeader
        title="Community"
        subtitle="Find groups that match your wellness goals"
        action={
          <span className="chip chip-active text-xs">
            {trendingCommunities.length} groups
          </span>
        }
      />

      <div className="community-header space-y-4">
        <ChipTabs
          className="community-tabs"
          tabs={[
            { id: 'discover', label: 'Discover' },
            { id: 'my-communities', label: 'My groups' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'discover' ? (
          <>
            <div className="app-card p-4">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="pr-4">
                  <p className="text-xs font-medium text-muted-foreground">Active groups</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {trendingCommunities.length}
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

            <section aria-label="Trending communities" className="trending-communities">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="section-title">Trending</h2>
                <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
              </div>

              {filtered.length > 0 ? (
                <ul className="section-card divide-y divide-border">
                  {filtered.map((community, index) => (
                    <li
                      key={community.id}
                      className="community-card flex items-center gap-3 px-4 py-3.5"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg">
                        {community.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {community.name}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                          {community.category}
                        </span>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:truncate">
                          {community.description}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {community.members} members
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="join-button min-h-10 shrink-0 px-4 text-xs"
                      >
                        Join
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">No communities found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search or category filter.
                  </p>
                </div>
              )}
            </section>

            <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-center">
              <p className="text-sm font-medium text-foreground">More features coming soon</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Group challenges, chat, and community leaderboards are in development.
              </p>
            </div>
          </>
        ) : (
          <section aria-label="My communities" className="my-communities">
            <div className="section-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground">No groups yet</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Join a community from Discover to see your groups and rankings here.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setActiveTab('discover')}>
                Browse communities
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            <div className="community-stats mt-4 rounded-2xl border border-dashed border-border px-4 py-5 text-center">
              <p className="text-xs text-muted-foreground">
                Your joined groups and rank will appear here once community features launch.
              </p>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
