'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import {
  ArrowLeft,
  CalendarDays,
  ChartColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Search,
  Settings2,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityAddMembersPanel } from '@/components/community/CommunityAddMembersPanel';
import { ContributionMedal } from '@/components/community/ContributionMedal';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import {
  communityAPI,
  type Community,
  type CommunityAnalytics,
  type CommunityDashboard,
  type CommunityLeaderboardRow,
} from '@/lib/api/community';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

interface CommunityDashboardTabProps {
  communityId: string;
  community: Community;
  isAdmin: boolean;
}

const CONTRIBUTION_PAGE_SIZE = 5;
const CONTRIBUTION_SEARCH_DEBOUNCE_MS = 280;

function formatValue(value: number, unit?: string | null) {
  const n = Number(value) || 0;
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

function ProgressBar({ percent }: { percent: number }) {
  const width = Math.min(Math.max(percent, 0), 100);
  const over = percent > 100;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div
        className={cn('h-full rounded-full transition-[width]', over ? 'bg-emerald-600' : 'bg-primary')}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function ScoreRing({ percent }: { percent: number }) {
  const value = Math.max(0, Number(percent) || 0);
  const capped = Math.min(value, 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (capped / 100) * circumference;
  const over = value > 100;

  return (
    <div className="relative h-[5.5rem] w-[5.5rem] shrink-0">
      <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-secondary"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={over ? 'text-emerald-600' : 'text-primary'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-bold tabular-nums leading-none text-foreground">
          {Math.round(value)}%
        </p>
      </div>
    </div>
  );
}

function RankingRow({
  row,
  selectedProfileId,
  valueLabel,
  showTopMedals,
  highlightYou = false,
}: {
  row: CommunityLeaderboardRow;
  selectedProfileId?: string | null;
  valueLabel: 'contribution' | 'value';
  showTopMedals?: boolean;
  highlightYou?: boolean;
}) {
  const isMe = String(row.profileId) === String(selectedProfileId);
  const isTop3 = Boolean(showTopMedals && row.rank >= 1 && row.rank <= 3);

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        highlightYou && 'bg-primary-soft/50',
        !highlightYou && isTop3 && row.rank === 1 && 'bg-amber-50/60',
        !highlightYou && isTop3 && row.rank === 2 && 'bg-slate-50/80',
        !highlightYou && isTop3 && row.rank === 3 && 'bg-orange-50/50'
      )}
    >
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">
        {row.rank}
      </span>
      <ProfileAvatar
        name={row.name}
        avatarUrl={row.avatarUrl}
        avatarSeed={row.avatarSeed}
        avatarStyle={row.avatarStyle}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 overflow-visible">
          <p className="truncate text-sm font-semibold text-foreground">
            {row.name}
            {isMe ? ' (you)' : ''}
          </p>
          {showTopMedals ? <ContributionMedal rank={row.rank} /> : null}
        </div>
        <p className="text-[11px] capitalize text-muted-foreground">
          {row.role}
          {highlightYou ? ' · your rank' : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {valueLabel === 'contribution' ? (
          <>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {Math.round(row.contributionPercent ?? 0)}%
            </p>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {formatValue(row.totalValue ?? 0)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatValue(row.totalValue ?? 0)}
            </p>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round(row.contributionPercent ?? 0)}% contrib.
            </p>
          </>
        )}
      </div>
    </li>
  );
}

function RankingList({
  ranking,
  selectedProfileId,
  valueLabel,
  emptyLabel,
  showTopMedals = false,
}: {
  ranking: CommunityLeaderboardRow[];
  selectedProfileId?: string | null;
  valueLabel: 'contribution' | 'value';
  emptyLabel: string;
  showTopMedals?: boolean;
}) {
  if (ranking.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {ranking.map((row) => (
        <RankingRow
          key={row.profileId}
          row={row}
          selectedProfileId={selectedProfileId}
          valueLabel={valueLabel}
          showTopMedals={showTopMedals}
        />
      ))}
    </ul>
  );
}

/**
 * Member contribution list with search + pagination (5/page).
 * On page 1, always includes the logged-in member even if their rank is outside the page.
 */
function MemberContributionList({
  ranking,
  selectedProfileId,
  emptyLabel,
  resetKey,
}: {
  ranking: CommunityLeaderboardRow[];
  selectedProfileId?: string | null;
  emptyLabel: string;
  /** Reset page/search when week or activity filter changes */
  resetKey: string;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setQuery('');
    setDebounced('');
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, CONTRIBUTION_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    if (!debounced) return ranking;
    const needle = debounced.toLowerCase();
    return ranking.filter((row) => String(row.name || '').toLowerCase().includes(needle));
  }, [ranking, debounced]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / CONTRIBUTION_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * CONTRIBUTION_PAGE_SIZE;
    return filtered.slice(start, start + CONTRIBUTION_PAGE_SIZE);
  }, [filtered, currentPage]);

  const myRow = useMemo(() => {
    if (!selectedProfileId) return null;
    return ranking.find((row) => String(row.profileId) === String(selectedProfileId)) || null;
  }, [ranking, selectedProfileId]);

  const myRowOnPage = pageItems.some(
    (row) => String(row.profileId) === String(selectedProfileId)
  );
  const showPinnedYou =
    currentPage === 1 && Boolean(myRow) && !myRowOnPage && !debounced;

  // When searching, still surface "you" on page 1 if you match the query but aren't in the slice
  const showPinnedYouWhileSearch =
    currentPage === 1 &&
    Boolean(myRow) &&
    !myRowOnPage &&
    Boolean(debounced) &&
    filtered.some((row) => String(row.profileId) === String(selectedProfileId));

  const pinnedYou = showPinnedYou || showPinnedYouWhileSearch ? myRow : null;

  return (
    <div>
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members by name…"
            className="h-11 w-full rounded-xl border border-input bg-secondary pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            inputMode="search"
          />
        </label>
      </div>

      {total === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          {debounced ? `No members found for “${debounced}”` : emptyLabel}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {pageItems.map((row) => (
              <RankingRow
                key={row.profileId}
                row={row}
                selectedProfileId={selectedProfileId}
                valueLabel="contribution"
                showTopMedals
              />
            ))}
          </ul>

          {pinnedYou ? (
            <div className="border-t border-dashed border-border">
              <p className="px-4 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-5">
                Your rank
              </p>
              <ul>
                <RankingRow
                  row={pinnedYou}
                  selectedProfileId={selectedProfileId}
                  valueLabel="contribution"
                  showTopMedals
                  highlightYou
                />
              </ul>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
            <p className="text-[11px] text-muted-foreground">
              Page {currentPage} of {totalPages} · {total} members
              {myRow ? ` · you #${myRow.rank}` : ''}
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function CommunityDashboardTab({
  communityId,
  community,
  isAdmin,
}: CommunityDashboardTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [weekOffset, setWeekOffset] = useState(0);
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);
  const [contributionActivityId, setContributionActivityId] = useState<string>('overall');
  const [activityProgressOpen, setActivityProgressOpen] = useState(false);
  const [memberContributionOpen, setMemberContributionOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const weeksQuery = useQuery({
    queryKey: ['community-weeks', communityId],
    queryFn: async () => {
      const res = await communityAPI.weekHistory(communityId);
      return res.data.data;
    },
  });

  const upcomingQuery = useQuery({
    queryKey: ['community-upcoming-events', communityId],
    queryFn: async () => {
      const res = await communityAPI.upcomingEvents(communityId, 5);
      return res.data.data.events ?? [];
    },
  });

  const weekViewQuery = useQuery({
    queryKey: ['community-week-view', communityId, weekOffset],
    queryFn: async () => {
      const res = await communityAPI.weekView(communityId, { weekOffset });
      return res.data.data;
    },
  });

  const updateMode = useMutation({
    mutationFn: (leaderboardMode: 'weekly' | 'monthly') =>
      communityAPI.update(communityId, { leaderboardMode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-week-view', communityId] });
    },
  });

  const restart = useMutation({
    mutationFn: () => communityAPI.restartLeaderboard(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-week-view', communityId] });
    },
  });

  const dashboard: CommunityDashboard | undefined = weekViewQuery.data?.dashboard;
  const analytics: CommunityAnalytics | undefined =
    weekViewQuery.data?.analytics || dashboard?.analytics;
  const aiSummary = weekViewQuery.data?.aiSummary;
  const activityAiNotes = weekViewQuery.data?.activityAiNotes?.notes ?? [];
  const notesByActivityId = useMemo(() => {
    const map = new Map<string, string>();
    activityAiNotes.forEach((n) => {
      if (n.activityId) map.set(n.activityId, n.note);
      if (n.activityName) map.set(n.activityName.toLowerCase(), n.note);
    });
    return map;
  }, [activityAiNotes]);
  const weekLabel = weekViewQuery.data?.week?.label;
  const isCurrent = weekViewQuery.data?.isCurrent !== false;
  const snapshot = weekViewQuery.data?.snapshot;

  const detailActivity = useMemo(() => {
    if (!detailActivityId || !dashboard) return null;
    return dashboard.byActivity.find((row) => row.activity.id === detailActivityId) || null;
  }, [dashboard, detailActivityId]);

  const contributionFilterOptions = useMemo(() => {
    const activityOptions = (dashboard?.byActivity || []).map((row) => ({
      value: row.activity.id,
      label: row.activity.name,
      description: 'Contribution for this activity only',
    }));
    return [
      {
        value: 'overall',
        label: 'All activities',
        description: 'Overall share across every community activity',
      },
      ...activityOptions,
    ];
  }, [dashboard?.byActivity]);

  const contributionRanking = useMemo(() => {
    if (!dashboard) return [];
    if (contributionActivityId === 'overall') return dashboard.overall ?? [];
    const activityRow = dashboard.byActivity.find(
      (row) => row.activity.id === contributionActivityId
    );
    return activityRow?.ranking ?? [];
  }, [dashboard, contributionActivityId]);

  const contributionSubtitle = useMemo(() => {
    if (contributionActivityId === 'overall') {
      return 'Overall share of all community activity units this week · sorted by contribution';
    }
    const activityRow = dashboard?.byActivity.find(
      (row) => row.activity.id === contributionActivityId
    );
    const activityName = activityRow?.activity.name || 'activity';
    const unit = activityRow?.unit || activityRow?.activity.baseUnit || '';
    const communityTarget = activityRow?.communityTarget ?? 0;
    const weeklyTarget = activityRow?.weeklyTarget ?? 0;
    return `Share of ${activityName} this week · community target ${formatValue(communityTarget, unit)} (per member ${formatValue(weeklyTarget, unit)})`;
  }, [contributionActivityId, dashboard?.byActivity]);

  const activityProgressRows = useMemo(() => {
    const fromAnalytics = analytics?.activities?.length ? analytics.activities : null;
    if (fromAnalytics) return fromAnalytics;
    return (dashboard?.byActivity || []).map((row) => ({
      activityId: row.activity.id,
      name: row.activity.name,
      unit: row.unit || row.activity.baseUnit || '',
      level: row.level || 'active',
      currentValue: row.totalValue ?? 0,
      weeklyTarget: row.weeklyTarget ?? 0,
      communityTarget: row.communityTarget ?? 0,
      progressPercent: row.progressPercent ?? 0,
    }));
  }, [analytics?.activities, dashboard?.byActivity]);

  useEffect(() => {
    if (contributionActivityId === 'overall') return;
    const exists = (dashboard?.byActivity || []).some(
      (row) => row.activity.id === contributionActivityId
    );
    if (!exists) setContributionActivityId('overall');
  }, [dashboard?.byActivity, contributionActivityId]);

  const maxPastWeeks = Math.max(
    12,
    Math.max(0, (weeksQuery.data?.weeks?.length || 1) - 1)
  );
  const canGoPrevious = weekOffset > -maxPastWeeks;
  const canGoNext = weekOffset < 0;

  const modeOptions = [
    {
      value: 'weekly',
      label: 'Weekly mode',
      description: 'Mon–Sun week (same as home points)',
    },
    {
      value: 'monthly',
      label: 'Monthly mode',
      description: 'Current month (restart resets season)',
    },
  ];

  if (detailActivity) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Back to dashboard"
            onClick={() => setDetailActivityId(null)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-foreground">
              {detailActivity.activity.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {weekLabel || 'This week'} · member contributions
            </p>
          </div>
        </div>

        <div className="section-card space-y-3 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Progress</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {Math.round(detailActivity.progressPercent ?? 0)}%
              </p>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {formatValue(detailActivity.totalValue ?? 0, detailActivity.unit)}
              <span className="mx-1">/</span>
              {formatValue(detailActivity.communityTarget ?? 0, detailActivity.unit)}
            </p>
          </div>
          <ProgressBar percent={detailActivity.progressPercent ?? 0} />
          <p className="text-[11px] text-muted-foreground">
            Per-member weekly target {formatValue(detailActivity.weeklyTarget ?? 0, detailActivity.unit)}{' '}
            · community target scales with {dashboard?.memberCount ?? 0} members
          </p>
        </div>

        <div className="section-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Member leaderboard</p>
            <p className="text-xs text-muted-foreground">Contribution % of this activity’s total</p>
          </div>
          <RankingList
            ranking={detailActivity.ranking}
            selectedProfileId={selectedProfile?._id}
            valueLabel="value"
            emptyLabel="No logs for this activity yet."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="section-card flex items-center gap-2 px-3 py-2.5">
        <Button
          size="icon"
          variant="ghost"
          disabled={!canGoPrevious || weekViewQuery.isFetching}
          onClick={() => {
            setDetailActivityId(null);
            setWeekOffset((v) => v - 1);
          }}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-foreground">
            {weekLabel || 'This week'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isCurrent
              ? `Current week · ${community.leaderboardMode} season`
              : 'Historical week'}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          disabled={!canGoNext || weekViewQuery.isFetching}
          onClick={() => {
            setDetailActivityId(null);
            setWeekOffset((v) => Math.min(0, v + 1));
          }}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {(upcomingQuery.data?.length || 0) > 0 ? (
        <div className="section-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Upcoming events</p>
              <p className="text-xs text-muted-foreground">From the community calendar</p>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {upcomingQuery.data!.slice(0, 5).map((event) => (
              <li key={event.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{event.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {DateTime.fromISO(event.startsAt).toFormat('ccc d LLL · h:mm a')}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weekViewQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="section-card overflow-hidden bg-gradient-to-br from-primary-soft/80 via-surface to-secondary/40 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <ScoreRing percent={analytics?.overallCommunityScore ?? 0} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Overall community score
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {weekLabel || 'This week'}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    Average activity completion vs community weekly targets
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-surface/90 px-3 py-2.5 text-left shadow-sm sm:ml-auto sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Participation
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                  {Math.round(analytics?.participation.rate ?? 0)}%
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {analytics?.participation.membersLogged ?? snapshot?.membersLogged ?? 0}/
                  {analytics?.participation.memberCount ??
                    snapshot?.memberCount ??
                    dashboard?.memberCount ??
                    0}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar percent={analytics?.overallCommunityScore ?? 0} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  label: 'Total target',
                  value: formatValue(analytics?.totalCommunityTarget ?? 0),
                },
                {
                  label: 'Completed',
                  value: formatValue(analytics?.totalCompleted ?? analytics?.totalValue ?? 0),
                },
                {
                  label: 'Remaining',
                  value: formatValue(analytics?.remainingTarget ?? 0),
                },
                {
                  label: 'Avg / member',
                  value: `${Math.round(analytics?.averageProgressPerMember ?? 0)}%`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border/60 bg-surface/80 px-3 py-2.5"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>
                {analytics?.participation.label ||
                  `${snapshot?.membersLogged ?? 0}/${snapshot?.memberCount ?? 0} members logged this week`}
              </span>
            </div>
          </div>

          {aiSummary?.text ? (
            <div className="section-card space-y-3 p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Monday community summary</p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{aiSummary.text}</p>
              </div>
              {aiSummary.highlights?.length ? (
                <ul className="space-y-1.5">
                  {aiSummary.highlights.map((h) => (
                    <li key={h} className="text-xs text-muted-foreground">
                      · {h}
                    </li>
                  ))}
                </ul>
              ) : null}
              {aiSummary.recommendations?.length ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recommendations
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {aiSummary.recommendations.map((r) => (
                      <li key={r} className="text-xs text-foreground/90">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <CollapsibleSection
            title="Activity progress"
            subtitle="Logged vs community weekly targets · tap to expand"
            icon={ChartColumnIncreasing}
            expanded={activityProgressOpen}
            onToggle={() => setActivityProgressOpen((value) => !value)}
            contentClassName="!space-y-0 !px-0 !pb-0 !pt-0"
          >
            {activityProgressRows.length ? (
              <ul className="divide-y divide-border">
                {activityProgressRows.map((activity) => {
                  const aiNote =
                    notesByActivityId.get(activity.activityId) ||
                    notesByActivityId.get(activity.name.toLowerCase());
                  return (
                    <li key={activity.activityId}>
                      <button
                        type="button"
                        className="flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 sm:px-5"
                        onClick={() => setDetailActivityId(activity.activityId)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {activity.name}
                            </p>
                            <p className="text-[11px] capitalize text-muted-foreground">
                              {activity.level} · logged{' '}
                              {formatValue(activity.currentValue, activity.unit)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Community weekly target{' '}
                              <span className="font-medium text-foreground/80">
                                {formatValue(activity.communityTarget, activity.unit)}
                              </span>
                              <span className="mx-1">·</span>
                              Per member{' '}
                              <span className="font-medium text-foreground/80">
                                {formatValue(activity.weeklyTarget, activity.unit)}
                              </span>
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                            {Math.round(activity.progressPercent)}%
                          </p>
                        </div>
                        <ProgressBar percent={activity.progressPercent} />
                        {aiNote ? (
                          <p className="text-[11px] leading-snug text-muted-foreground">{aiNote}</p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
                No community activities configured.
              </p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Member contribution"
            subtitle={contributionSubtitle}
            icon={Trophy}
            expanded={memberContributionOpen}
            onToggle={() => setMemberContributionOpen((value) => !value)}
            overflowVisible
            contentClassName="!space-y-0 !px-0 !pb-0 !pt-0"
          >
            <div className="space-y-3 border-b border-border px-4 py-3 sm:px-5">
              <CustomDropdown
                value={contributionActivityId}
                options={contributionFilterOptions}
                disabled={weekViewQuery.isFetching || contributionFilterOptions.length <= 1}
                onChange={(value) => setContributionActivityId(value)}
              />
            </div>
            <MemberContributionList
              ranking={contributionRanking}
              selectedProfileId={selectedProfile?._id}
              resetKey={`${weekOffset}:${contributionActivityId}`}
              emptyLabel={
                contributionActivityId === 'overall'
                  ? 'No community activity logged this week.'
                  : 'No logs for this activity yet.'
              }
            />
          </CollapsibleSection>
        </>
      )}

      {isAdmin && isCurrent && community.status !== 'deleted' ? (
        <>
          <CollapsibleSection
            title="Admin controls"
            subtitle="Season mode and monthly board reset"
            icon={Settings2}
            expanded={adminOpen}
            onToggle={() => setAdminOpen((value) => !value)}
            overflowVisible
            contentClassName="space-y-3"
          >
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">Season mode</p>
              <CustomDropdown
                value={community.leaderboardMode}
                options={modeOptions}
                disabled={updateMode.isPending}
                onChange={(value) => updateMode.mutate(value as 'weekly' | 'monthly')}
              />
            </div>
            <Button
              variant="outline"
              className="w-full justify-center"
              disabled={restart.isPending}
              onClick={() => {
                requestConfirm({
                  title: 'Restart monthly season board?',
                  description:
                    'New monthly “current” scores will count from now. Weekly community analytics are not affected. This cannot be undone.',
                  confirmLabel: 'Restart',
                  onConfirm: () => restart.mutateAsync(),
                });
              }}
            >
              {restart.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Restart overall board
            </Button>
          </CollapsibleSection>

          <CommunityAddMembersPanel communityId={communityId} />
        </>
      ) : null}

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        {DateTime.now().setZone('Asia/Kolkata').toFormat('ccc d LLL')} · community targets only
      </p>
      {ConfirmDialogElement}
    </div>
  );
}
