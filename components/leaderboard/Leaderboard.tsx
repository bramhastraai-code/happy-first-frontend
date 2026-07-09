'use client';

import { useState, useEffect } from 'react';
import { leaderboardAPI } from '@/lib/api/leaderboard';
import type { LeaderboardData } from '@/lib/api/leaderboard';
import { activityAPI, Activity } from '@/lib/api/activity';
import { useAuthStore } from '@/lib/store/authStore';
import { ChipTabs } from '@/components/ui/ChipTabs';
import ActivitySelect from '@/components/ui/ActivitySelect';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

type WeekViewType = 'current' | 'previous';

export default function Leaderboard() {
  const { selectedProfile } = useAuthStore();
  const [weekView, setWeekView] = useState<WeekViewType>('current');
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');

  useEffect(() => {
    void activityAPI.getList().then((response) => {
      setActivities(response.data.data);
      setSelectedActivity('');
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedActivity, weekView]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const date = new Date();
        if (weekView === 'previous') date.setDate(date.getDate() - 7);
        const dateToUse = date.toISOString().split('T')[0];
        const response = await leaderboardAPI.getWeekly(selectedActivity, dateToUse, page);

        if (response.data?.data) {
          setLeaderboard(response.data.data);
        }
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchLeaderboard();
  }, [selectedActivity, weekView, page, selectedProfile?._id]);

  const unit = activities.find((a) => a._id === selectedActivity)?.baseUnit || 'points';
  const ranks = leaderboard?.ranks ?? [];
  const pagination = leaderboard?.pagination;
  const totalLeaders = leaderboard?.totalLeaders ?? 0;
  const userRank = ranks.find(
    (entry) => entry.isCurrentUser || entry.user._id === selectedProfile?._id
  ) ?? null;
  const startRank = totalLeaders === 0 || !pagination ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRank = pagination ? Math.min(pagination.page * pagination.limit, totalLeaders) : 0;

  return (
    <div className="space-y-3 overflow-visible">
      <ChipTabs
        tabs={[
          { id: 'current', label: 'This week' },
          { id: 'previous', label: 'Last week' },
        ]}
        active={weekView}
        onChange={(id) => setWeekView(id as WeekViewType)}
        layout="balanced"
      />
      <ActivitySelect
        value={selectedActivity}
        onChange={setSelectedActivity}
        activities={activities}
      />

      {loading && !leaderboard && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading ranks…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!error && userRank && (
        <div className="rounded-2xl border border-primary/20 bg-primary-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your rank on this page</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="text-2xl font-bold text-foreground">#{userRank.rank}</p>
            <p className="text-sm font-semibold text-foreground">
              {userRank.value.toFixed(1)} <span className="font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>
        </div>
      )}

      {!error && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {loading && leaderboard ? (
            <li className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Updating ranks…
            </li>
          ) : ranks.length === 0 ? (
            <li className="px-4 py-10 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No rankings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Complete activities to appear here.</p>
            </li>
          ) : (
            ranks.map((entry) => {
              const isYou = entry.isCurrentUser || entry.user._id === selectedProfile?._id;
              const isTop3 = entry.rank <= 3;

              return (
                <li
                  key={`${entry.user._id}-${entry.rank}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    isYou && 'bg-accent/70'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      entry.rank === 1 && 'bg-amber-100 text-amber-800',
                      entry.rank === 2 && 'bg-stone-200 text-stone-700',
                      entry.rank === 3 && 'bg-orange-100 text-orange-800',
                      !isTop3 && 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {isTop3 ? <Medal className="h-4 w-4" /> : entry.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate font-medium', isYou ? 'text-primary' : 'text-foreground')}>
                      {entry.user.name}
                      {isYou && <span className="ml-2 text-xs font-semibold text-primary">(you)</span>}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {entry.value.toFixed(1)}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      )}

      {!error && pagination && totalLeaders > 0 && (
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {startRank}–{endRank} of {totalLeaders}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasPreviousPage || loading}
              onClick={() => setPage((current) => current - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="min-w-[4.5rem] text-center text-xs font-medium text-muted-foreground">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((current) => current + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
