'use client';

import { useState, useEffect } from 'react';
import { leaderboardAPI } from '@/lib/api/leaderboard';
import { activityAPI, Activity } from '@/lib/api/activity';
import { useAuthStore } from '@/lib/store/authStore';
import { ChipTabs } from '@/components/ui/ChipTabs';
import ActivitySelect from '@/components/ui/ActivitySelect';
import { Loader2, Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

type WeekViewType = 'current' | 'previous';

export default function Leaderboard() {
  const { selectedProfile } = useAuthStore();
  const [weekView, setWeekView] = useState<WeekViewType>('current');
  const [leaderboardData, setLeaderboardData] = useState<{ rank: number; user: { _id: string; name: string }; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [userRank, setUserRank] = useState<{ rank: number; user: { _id: string; name: string }; value: number } | null>(null);

  useEffect(() => {
    void activityAPI.getList().then((response) => {
      setActivities(response.data.data);
      setSelectedActivity('');
    });
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const date = new Date();
        if (weekView === 'previous') date.setDate(date.getDate() - 7);
        const dateToUse = date.toISOString().split('T')[0];
        const response = await leaderboardAPI.getWeekly(selectedActivity, dateToUse);

        if (response.data?.data) {
          setLeaderboardData(response.data.data.ranks);
          const rank = response.data.data.ranks.find((entry) => entry.user._id === selectedProfile?._id) ?? null;
          setUserRank(rank);
        }
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchLeaderboard();
  }, [selectedActivity, weekView, selectedProfile?._id]);

  const unit = activities.find((a) => a._id === selectedActivity)?.baseUnit || 'points';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipTabs
          tabs={[
            { id: 'current', label: 'This week' },
            { id: 'previous', label: 'Last week' },
          ]}
          active={weekView}
          onChange={(id) => setWeekView(id as WeekViewType)}
          className="min-w-0 flex-1"
        />
        <ActivitySelect
          value={selectedActivity}
          onChange={setSelectedActivity}
          activities={activities}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading ranks…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && userRank && (
        <div className="rounded-2xl border border-primary/20 bg-primary-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your rank</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="text-2xl font-bold text-foreground">#{userRank.rank}</p>
            <p className="text-sm font-semibold text-foreground">
              {userRank.value.toFixed(1)} <span className="font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {leaderboardData.length === 0 ? (
            <li className="px-4 py-10 text-center">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No rankings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Complete activities to appear here.</p>
            </li>
          ) : (
            leaderboardData.map((entry) => {
              const isYou = entry.user._id === selectedProfile?._id;
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
    </div>
  );
}
