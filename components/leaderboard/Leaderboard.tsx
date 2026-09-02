'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { leaderboardAPI } from '@/lib/api/leaderboard';
import type { LeaderboardData } from '@/lib/api/leaderboard';
import { activityAPI, Activity } from '@/lib/api/activity';
import { useAuthStore } from '@/lib/store/authStore';
import ActivitySelect from '@/components/ui/ActivitySelect';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Trophy, Calendar } from 'lucide-react';
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
    <div className="space-y-3 overflow-visible">
      <div className="space-y-2">
        <div className="flex items-center gap-1 rounded-2xl border border-input bg-surface px-1.5 py-1.5">
          <button
            type="button"
            disabled={weekOffset <= -MAX_PAST_WEEKS || loading}
            onClick={() => setWeekOffset((value) => value - 1)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="text-sm font-semibold leading-tight text-foreground">{week.label}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{week.rangeLabel}</p>
          </div>
          <button
            type="button"
            disabled={weekOffset >= 0 || loading}
            onClick={() => setWeekOffset((value) => Math.min(0, value + 1))}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
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
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-semibold text-primary transition-colors hover:bg-accent disabled:opacity-50 sm:h-9"
            >
              <Calendar className="h-3.5 w-3.5" />
              This week
            </button>
          ) : null}
        </div>
      </div>
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
              {formatScore(userRank.value, asPercent)}{' '}
              {!asPercent && <span className="font-normal text-muted-foreground">{unit}</span>}
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

              return (
                <li
                  key={`${entry.user._id}-${entry.rank}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    isYou && 'bg-accent/70'
                  )}
                >
                  <LeaderboardRankBadge
                    rank={entry.rank}
                    name={entry.user.name}
                    avatarUrl={entry.user.avatarUrl}
                    avatarSeed={entry.user.avatarSeed}
                    avatarStyle={entry.user.avatarStyle}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate font-medium', isYou ? 'text-primary' : 'text-foreground')}>
                      {entry.user.name}
                      {isYou && <span className="ml-2 text-xs font-semibold text-primary">(you)</span>}
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
