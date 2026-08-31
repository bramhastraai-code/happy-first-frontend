'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import {
  CalendarDays,
  ChartColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Loader2,
  MessageCircle,
  RotateCcw,
  Search,
  Settings2,
  Target,
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
import { FeedMessagesPanel } from '@/components/feed/FeedMessagesPanel';
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

function ProgressBar({
  percent,
  size = 'sm',
}: {
  percent: number;
  size?: 'sm' | 'lg';
}) {
  const width = Math.min(Math.max(percent, 0), 100);
  const over = percent > 100;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full bg-black/[0.06]',
        size === 'lg' ? 'h-3' : 'h-2'
      )}
    >
      <div
        className={cn(
          'relative h-full rounded-full transition-[width] duration-700 ease-out',
          over
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
            : 'bg-gradient-to-r from-primary via-primary to-primary-hover'
        )}
        style={{ width: `${width}%` }}
      >
        <span className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/35 to-transparent" />
      </div>
    </div>
  );
}

function ScoreRing({
  percent,
  size = 'md',
}: {
  percent: number;
  size?: 'md' | 'lg';
}) {
  const value = Math.max(0, Number(percent) || 0);
  const capped = Math.min(value, 100);
  const radius = size === 'lg' ? 46 : 38;
  const view = size === 'lg' ? 112 : 96;
  const stroke = size === 'lg' ? 9 : 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (capped / 100) * circumference;
  const over = value > 100;
  const center = view / 2;

  return (
    <div
      className={cn(
        'relative shrink-0',
        size === 'lg' ? 'h-[7rem] w-[7rem]' : 'h-[5.5rem] w-[5.5rem]'
      )}
    >
      <svg viewBox={`0 0 ${view} ${view}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-black/[0.06]"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-700 ease-out',
            over ? 'text-emerald-500' : 'text-primary'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className={cn(
            'font-bold tabular-nums leading-none tracking-tight text-foreground',
            size === 'lg' ? 'text-2xl' : 'text-xl'
          )}
        >
          {Math.round(value)}%
        </p>
        {size === 'lg' ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Score
          </p>
        ) : null}
      </div>
    </div>
  );
}

function scoreMood(percent: number) {
  if (percent >= 100) return { label: 'Target crushed', tone: 'text-emerald-700 bg-emerald-500/15' };
  if (percent >= 70) return { label: 'Strong week', tone: 'text-primary bg-primary/15' };
  if (percent >= 40) return { label: 'Building momentum', tone: 'text-amber-700 bg-amber-500/15' };
  if (percent > 0) return { label: 'Getting started', tone: 'text-sky-700 bg-sky-500/15' };
  return { label: 'Ready to begin', tone: 'text-muted-foreground bg-black/[0.04]' };
}

function formatCompactStat(value: number, unit?: string | null) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  let core: string;
  if (abs >= 1_000_000) core = `${(n / 1_000_000).toFixed(1)}M`;
  else if (abs >= 10_000) core = `${(n / 1_000).toFixed(1)}k`;
  else core = Math.round(n).toLocaleString();
  return unit ? `${core} ${unit}` : core;
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
      <Link href={`/feed/profile/${row.profileId}`} className="shrink-0">
        <ProfileAvatar
          name={row.name}
          avatarUrl={row.avatarUrl}
          avatarSeed={row.avatarSeed}
          avatarStyle={row.avatarStyle}
          size="sm"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 overflow-visible">
          <Link
            href={`/feed/profile/${row.profileId}`}
            className="truncate text-sm font-semibold text-foreground hover:underline"
          >
            {row.name}
            {isMe ? ' (you)' : ''}
          </Link>
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
  const [memberContributionOpen, setMemberContributionOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [buddyMessage, setBuddyMessage] = useState<string | null>(null);
  const [buddyChatOpen, setBuddyChatOpen] = useState(false);

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

  const buddyQuery = useQuery({
    queryKey: ['community-buddy', communityId],
    enabled: weekOffset === 0,
    queryFn: async () => {
      const res = await communityAPI.getBuddy(communityId);
      return res.data.data;
    },
  });

  const membersLoggedCount =
    weekViewQuery.data?.snapshot?.membersLogged ??
    weekViewQuery.data?.analytics?.participation?.membersLogged ??
    0;
  const overallEmpty = (weekViewQuery.data?.dashboard?.overall?.length ?? 0) === 0;

  const membersFallbackQuery = useQuery({
    queryKey: ['community-members', communityId, 'contribution-fallback'],
    enabled: Boolean(weekViewQuery.isSuccess && overallEmpty),
    queryFn: async () => {
      const res = await communityAPI.members(communityId);
      return res.data.data.members ?? [];
    },
  });

  const nudgeBuddy = useMutation({
    mutationFn: () => communityAPI.nudgeBuddy(communityId),
    onSuccess: () => {
      setBuddyMessage('Nudge sent to your buddy');
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not nudge buddy';
      setBuddyMessage(msg);
    },
  });

  const reassignBuddies = useMutation({
    mutationFn: () => communityAPI.assignBuddies(communityId, 'auto'),
    onSuccess: () => {
      setBuddyMessage('Buddies reshuffled for this week');
      void queryClient.invalidateQueries({ queryKey: ['community-buddy', communityId] });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not reassign buddies';
      setBuddyMessage(msg);
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
    const raw =
      contributionActivityId === 'overall'
        ? dashboard.overall ?? []
        : dashboard.byActivity.find((row) => row.activity.id === contributionActivityId)
            ?.ranking ?? [];
    let visible = raw.filter((row) => {
      const name = String(row.name || '').trim().toLowerCase();
      return name !== 'deleted profile' && name !== 'deleted user';
    });

    // First day / no logs: if ranking still empty, show active members A–Z at 0.
    if (
      visible.length === 0 &&
      contributionActivityId === 'overall' &&
      (membersFallbackQuery.data?.length || 0) > 0
    ) {
      visible = [...(membersFallbackQuery.data || [])]
        .map((m) => ({
          profileId: String(m.profile?.id || ''),
          name: m.profile?.name || 'Member',
          role: m.role || 'member',
          avatarUrl: m.profile?.avatarUrl ?? null,
          avatarSeed: m.profile?.avatarSeed ?? null,
          avatarStyle: m.profile?.avatarStyle ?? null,
          points: 0,
          totalValue: 0,
          contributionPercent: 0,
          rank: 0,
        }))
        .filter((row) => row.profileId)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }

    if (membersLoggedCount === 0 && visible.length > 0) {
      visible = [...visible].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), undefined, {
          sensitivity: 'base',
        })
      );
    }

    return visible.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [
    dashboard,
    contributionActivityId,
    membersFallbackQuery.data,
    membersLoggedCount,
  ]);

  const contributionSubtitle = useMemo(() => {
    if (contributionActivityId === 'overall') {
      if (membersLoggedCount === 0) {
        return 'No logs yet this week · members shown A–Z';
      }
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
            <ChevronLeft className="h-4 w-4" />
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
      <div
        className={cn(
          'flex items-center gap-2 rounded-[1.35rem] border border-white/70',
          'bg-white/70 px-2.5 py-2 shadow-sm backdrop-blur-xl'
        )}
      >
        <Button
          size="icon"
          variant="ghost"
          disabled={!canGoPrevious || weekViewQuery.isFetching}
          onClick={() => {
            setDetailActivityId(null);
            setWeekOffset((v) => v - 1);
          }}
          aria-label="Previous week"
          className="rounded-full"
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
          className="rounded-full"
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

      {weekOffset === 0 ? (
        <div className="section-card overflow-hidden p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Buddy for the week</p>
              {buddyQuery.isLoading ? (
                <p className="mt-1 text-xs text-muted-foreground">Finding your buddy…</p>
              ) : buddyQuery.data?.buddy ? (
                <>
                  <div className="mt-2 flex items-center gap-2.5">
                    <ProfileAvatar
                      name={buddyQuery.data.buddy.name}
                      avatarUrl={buddyQuery.data.buddy.avatarUrl}
                      avatarSeed={buddyQuery.data.buddy.avatarSeed}
                      avatarStyle={buddyQuery.data.buddy.avatarStyle}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {buddyQuery.data.buddy.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Motivate each other to stay consistent
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!buddyQuery.data.canMessage || !buddyQuery.data.buddy.userId}
                      onClick={() => setBuddyChatOpen(true)}
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!buddyQuery.data.canNudge || nudgeBuddy.isPending}
                      onClick={() => nudgeBuddy.mutate()}
                    >
                      {nudgeBuddy.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Nudge
                    </Button>
                  </div>
                </>
              ) : buddyQuery.data?.isBye ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  You have a bye this week (odd member count). Cheer on the community instead!
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  No buddy assigned yet. Add members or ask an admin to reshuffle.
                </p>
              )}
              {isAdmin ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-8 px-2 text-xs"
                  disabled={reassignBuddies.isPending}
                  onClick={() => {
                    void requestConfirm({
                      title: 'Reshuffle buddies?',
                      description:
                        'This re-pairs all active members for the current week. Existing pairs will change.',
                      confirmLabel: 'Reshuffle',
                      destructive: false,
                      onConfirm: () => reassignBuddies.mutateAsync(),
                    });
                  }}
                >
                  {reassignBuddies.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Reshuffle pairs
                </Button>
              ) : null}
              {buddyMessage ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{buddyMessage}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {weekViewQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {(() => {
            const overallScore = analytics?.overallCommunityScore ?? 0;
            const mood = scoreMood(overallScore);
            const membersLogged =
              analytics?.participation.membersLogged ?? snapshot?.membersLogged ?? 0;
            const memberCount =
              analytics?.participation.memberCount ??
              snapshot?.memberCount ??
              dashboard?.memberCount ??
              0;
            const participationRate = Math.round(analytics?.participation.rate ?? 0);
            const stats = [
              {
                label: 'Total target',
                value: formatCompactStat(analytics?.totalCommunityTarget ?? 0),
                icon: Target,
              },
              {
                label: 'Completed',
                value: formatCompactStat(
                  analytics?.totalCompleted ?? analytics?.totalValue ?? 0
                ),
                icon: Trophy,
              },
              {
                label: 'Remaining',
                value: formatCompactStat(analytics?.remainingTarget ?? 0),
                icon: ChartColumnIncreasing,
              },
              {
                label: 'Avg / member',
                value: `${Math.round(analytics?.averageProgressPerMember ?? 0)}%`,
                icon: Users,
              },
            ] as const;

            return (
              <div
                className={cn(
                  'relative overflow-hidden rounded-[1.75rem] border border-white/70',
                  'bg-gradient-to-br from-white/90 via-primary-soft/50 to-sky-100/40',
                  'p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)] backdrop-blur-xl'
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-sky-400/15 blur-3xl"
                />

                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Community details
                    </p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                      Overall community score
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {weekLabel || 'This week'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold',
                      mood.tone
                    )}
                  >
                    {mood.label}
                  </span>
                </div>

                <div className="relative mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
                  <div
                    className={cn(
                      'relative rounded-[1.5rem] border border-white/80 bg-white/70 p-3',
                      'shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md'
                    )}
                  >
                    <ScoreRing percent={overallScore} size="lg" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-4">
                    <p className="text-center text-[12px] leading-relaxed text-muted-foreground sm:text-left">
                      Average activity completion vs community weekly targets
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
                        <span className="text-muted-foreground">Weekly progress</span>
                        <span className="tabular-nums text-foreground">
                          {Math.round(overallScore)}%
                        </span>
                      </div>
                      <ProgressBar percent={overallScore} size="lg" />
                    </div>

                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border border-white/80 bg-white/65 px-3.5 py-3',
                        'shadow-sm backdrop-blur-md'
                      )}
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <Users className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Participation
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {membersLogged}/{memberCount} members logged
                        </p>
                      </div>
                      <p className="shrink-0 text-xl font-bold tabular-nums text-primary">
                        {participationRate}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className={cn(
                          'rounded-2xl border border-white/80 bg-white/65 px-3 py-3',
                          'shadow-sm backdrop-blur-md transition hover:bg-white/85'
                        )}
                      >
                        <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-base font-bold tabular-nums tracking-tight text-foreground">
                          {stat.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <p className="relative mt-4 text-center text-[11px] text-muted-foreground sm:text-left">
                  {analytics?.participation.label ||
                    `${membersLogged}/${memberCount} members logged this week`}
                </p>
              </div>
            );
          })()}

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
                  ? 'No active members to show yet.'
                  : 'No logs for this activity yet.'
              }
            />
          </CollapsibleSection>

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
      <FeedMessagesPanel
        open={buddyChatOpen}
        onClose={() => setBuddyChatOpen(false)}
        startWithUser={
          buddyQuery.data?.buddy
            ? {
                userId: buddyQuery.data.buddy.userId,
                profileId: buddyQuery.data.buddy.profileId,
                name: buddyQuery.data.buddy.name,
                avatarUrl: buddyQuery.data.buddy.avatarUrl,
                avatarSeed: buddyQuery.data.buddy.avatarSeed,
                avatarStyle: buddyQuery.data.buddy.avatarStyle,
              }
            : null
        }
      />
      {ConfirmDialogElement}
    </div>
  );
}
