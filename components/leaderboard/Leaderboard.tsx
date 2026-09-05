'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { leaderboardAPI } from '@/lib/api/leaderboard';
import type { LeaderboardData } from '@/lib/api/leaderboard';
import { activityAPI, Activity } from '@/lib/api/activity';
import { useAuthStore } from '@/lib/store/authStore';
import ActivitySelect from '@/components/ui/ActivitySelect';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveProfileTimezone } from '@/lib/utils/profileTime';
import { LeaderboardRankBadge } from '@/components/leaderboard/LeaderboardRankBadge';

const MAX_PAST_WEEKS = 52;

function weekBounds(offset: number, timezone?: string | null) {
  const zone = resolveProfileTimezone(timezone);
  const now = DateTime.now().setZone(zone);
  const start = now.startOf('week').plus({ weeks: offset });
  const weekEnd = start.endOf('week');
  const end = offset === 0 ? now : weekEnd;
  const sameYear = start.year === weekEnd.year;
  const rangeLabel = sameYear
    ? `${start.toFormat('d LLL')} – ${weekEnd.toFormat('d LLL yyyy')}`
    : `${start.toFormat('d LLL yyyy')} – ${weekEnd.toFormat('d LLL yyyy')}`;
  return {
    start: start.toISODate() ?? '',
    end: end.toISODate() ?? '',
    label: offset === 0 ? 'This week' : 'Past week',
    rangeLabel,
  };
}

function formatScore(value: number, asPercent: boolean) {
  const formatted = Number(value).toFixed(2);
  return asPercent ? `${formatted}%` : formatted;
}

type LeaderboardProps = {
  categoryFilter?: 'body' | 'mind' | 'soul' | null;
  onCategoryFilterClear?: () => void;
};

export default function Leaderboard({
  categoryFilter = null,
  onCategoryFilterClear,
}: LeaderboardProps) {
  const { selectedProfile } = useAuthStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');

  const week = useMemo(
    () => weekBounds(weekOffset, selectedProfile?.timezone),
    [weekOffset, selectedProfile?.timezone]
  );
  const filteredActivities = useMemo(() => {
    if (!categoryFilter) return activities;
    return activities.filter(
      (activity) => (activity.category || '').toLowerCase() === categoryFilter
    );
  }, [activities, categoryFilter]);
  const asPercent = !selectedActivity;

  useEffect(() => {
    void activityAPI.getList().then((response) => {
      setActivities(response.data.data);
      setSelectedActivity('');
    });
  }, []);

  useEffect(() => {
    if (categoryFilter) {
      setSelectedActivity('');
    }
  }, [categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [selectedActivity, weekOffset, categoryFilter]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await leaderboardAPI.getRange(
          selectedActivity,
          week.start,
          week.end,
          page,
          15,
          categoryFilter && !selectedActivity ? categoryFilter : undefined
        );

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
  }, [selectedActivity, categoryFilter, week.start, week.end, page, selectedProfile?._id]);

  const unit = filteredActivities.find((a) => a._id === selectedActivity)?.baseUnit || '%';
  const ranks = leaderboard?.ranks ?? [];
  const pagination = leaderboard?.pagination;
  const totalLeaders = leaderboard?.totalLeaders ?? 0;
  const userRank = ranks.find(
    (entry) => entry.isCurrentUser || entry.user._id === selectedProfile?._id
  ) ?? null;
  const startRank = totalLeaders === 0 || !pagination ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRank = pagination ? Math.min(pagination.page * pagination.limit, totalLeaders) : 0;

  return (
    <div className="space-y-4 overflow-visible pt-2">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={weekOffset <= -MAX_PAST_WEEKS || loading}
            onClick={() => setWeekOffset((value) => value - 1)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-semibold leading-tight text-foreground">{week.label}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{week.rangeLabel}</p>
          </div>
          <button
            type="button"
            disabled={weekOffset >= 0 || loading}
            onClick={() => setWeekOffset((value) => Math.min(0, value + 1))}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ActivitySelect
            className="min-w-0 flex-1"
            value={selectedActivity}
            onChange={(activityId) => {
              setSelectedActivity(activityId);
              if (activityId && categoryFilter) {
                onCategoryFilterClear?.();
              }
            }}
            activities={filteredActivities}
            allLabel={
              categoryFilter
                ? `All ${categoryFilter} activities`
                : 'All activities'
            }
          />
          {weekOffset !== 0 ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setWeekOffset(0)}
              className="shrink-0 text-xs font-semibold text-primary disabled:opacity-50"
            >
              This week
            </button>
          ) : null}
        </div>
      </div>
      {loading && !leaderboard && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading ranks…
        </div>
      )}

      {error && (
        <p className="py-2 text-center text-sm text-destructive">{error}</p>
      )}

      {!error && userRank && (
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">#{userRank.rank}</p>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Your rank</p>
          </div>
          <p className="text-right text-sm font-semibold tabular-nums text-foreground">
            {formatScore(userRank.value, asPercent)}
            {!asPercent ? (
              <span className="ml-1 font-normal text-muted-foreground">{unit}</span>
            ) : null}
          </p>
        </div>
      )}

      {!error && (
        <ul>
          {loading && leaderboard ? (
            <li className="flex items-center justify-center gap-2 px-1 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Updating ranks…
            </li>
          ) : ranks.length === 0 ? (
            <li className="px-1 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No rankings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Complete activities to appear here.</p>
            </li>
          ) : (
            ranks.map((entry) => {
              const isYou = entry.isCurrentUser || entry.user._id === selectedProfile?._id;

              return (
                <li
                  key={`${entry.user._id}-${entry.rank}`}
                  className="flex items-center gap-3 px-1 py-2.5"
                >
                  <LeaderboardRankBadge
                    rank={entry.rank}
                    name={entry.user.name}
                    avatarUrl={entry.user.avatarUrl}
                    avatarSeed={entry.user.avatarSeed}
                    avatarStyle={entry.user.avatarStyle}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', isYou ? 'text-primary' : 'text-foreground')}>
                      {entry.user.name}
                      {isYou ? <span className="ml-1.5 text-xs font-semibold text-primary">(you)</span> : null}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatScore(entry.value, asPercent)}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      )}

      {!error && pagination && totalLeaders > 0 && (
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <p className="text-[11px] text-muted-foreground">
            {startRank}–{endRank} of {totalLeaders}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage || loading}
              onClick={() => setPage((current) => current - 1)}
              className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-[11px] font-medium text-muted-foreground">
              {pagination.page}/{pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={!pagination.hasNextPage || loading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
