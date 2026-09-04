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
import { LeaderboardRankBadge } from '@/components/leaderboard/LeaderboardRankBadge';
import { hasUploadedProfileAvatar } from '@/lib/utils/avatar';
import { useAuthStore } from '@/lib/store/authStore';
import { MoodFace } from '@/components/mood/MoodFace';
import { firstNameFrom } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface CommunityDashboardTabProps {
  communityId: string;
  community: Community;
  isAdmin: boolean;
  openAdminOnMount?: boolean;
  onAdminOpenHandled?: () => void;
}

const CONTRIBUTION_SEARCH_DEBOUNCE_MS = 280;

const STAT_COLORS = ['#EA580C', '#6CBC5A', '#4DB6A8', '#E8A838'] as const;

function formatValue(value: number, unit?: string | null) {
  const n = Number(value) || 0;
  const rounded = Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
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
  color,
}: {
  percent: number;
  size?: 'md' | 'lg';
  color?: string;
}) {
  const value = Math.max(0, Number(percent) || 0);
  const capped = Math.min(value, 100);
  const radius = size === 'lg' ? 46 : 38;
  const view = size === 'lg' ? 112 : 96;
  const stroke = size === 'lg' ? 9 : 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (capped / 100) * circumference;
  const center = view / 2;
  const strokeColor = color || (value > 100 ? '#6CBC5A' : '#EA580C');

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
          className="text-black/[0.08]"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className={cn(
            'font-serif font-semibold tabular-nums leading-none tracking-tight text-foreground',
            size === 'lg' ? 'text-2xl' : 'text-xl'
          )}
        >
          {Math.round(value)}%
        </p>
      </div>
    </div>
  );
}

function scoreMood(percent: number) {
  if (percent >= 100) return { label: 'rad', color: '#C6D63C', face: 'rad' as const };
  if (percent >= 70) return { label: 'good', color: '#6CBC5A', face: 'good' as const };
  if (percent >= 40) return { label: 'meh', color: '#4DB6A8', face: 'meh' as const };
  if (percent > 0) return { label: 'bad', color: '#7E9AAB', face: 'bad' as const };
  return { label: 'awful', color: '#6B5E56', face: 'awful' as const };
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
  const showUploadedPhoto = hasUploadedProfileAvatar(row.avatarUrl, row.avatarStyle);

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        highlightYou && 'bg-primary-soft/40'
      )}
    >
      <LeaderboardRankBadge
        rank={row.rank}
        name={row.name}
        avatarUrl={row.avatarUrl}
        avatarSeed={row.avatarSeed}
        avatarStyle={row.avatarStyle}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 overflow-visible">
          <Link
            href={`/feed/profile/${row.profileId}`}
            className="truncate text-sm font-semibold text-foreground hover:underline"
          >
            {isMe ? 'You' : row.name}
          </Link>
          {showTopMedals && !showUploadedPhoto ? <ContributionMedal rank={row.rank} /> : null}
        </div>
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
              {Math.round(row.contributionPercent ?? 0)}%
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
 * Member contribution list with search. Shows every matching member.
 */
function MemberContributionList({
  ranking,
  selectedProfileId,
  emptyLabel,
  resetKey,
  loading = false,
}: {
  ranking: CommunityLeaderboardRow[];
  selectedProfileId?: string | null;
  emptyLabel: string;
  resetKey: string;
  loading?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    setQuery('');
    setDebounced('');
  }, [resetKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
    }, CONTRIBUTION_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    if (!debounced) return ranking;
    const needle = debounced.toLowerCase();
    return ranking.filter((row) => String(row.name || '').toLowerCase().includes(needle));
  }, [ranking, debounced]);

  const total = filtered.length;

  return (
    <div>
      <div className="px-4 pb-2 pt-1 sm:px-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-xl border border-border bg-secondary/70 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            inputMode="search"
          />
        </label>
      </div>

      {loading && total === 0 ? (
        <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-5">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : total === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-5">
          {debounced ? 'No matches' : emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((row) => (
            <RankingRow
              key={row.profileId}
              row={row}
              selectedProfileId={selectedProfileId}
              valueLabel="contribution"
              showTopMedals
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MembersStrip({
  ranking,
  selectedProfileId,
}: {
  ranking: CommunityLeaderboardRow[];
  selectedProfileId?: string | null;
}) {
  if (ranking.length === 0) return null;

  return (
    <div className="-mx-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-3 px-1">
        {ranking.map((row) => {
          const isMe = String(row.profileId) === String(selectedProfileId);
          return (
            <li key={row.profileId} className="w-[3.4rem] shrink-0">
              <Link
                href={`/feed/profile/${row.profileId}`}
                className="flex flex-col items-center gap-1.5"
              >
                <ProfileAvatar
                  name={row.name}
                  avatarUrl={row.avatarUrl}
                  avatarSeed={row.avatarSeed}
                  avatarStyle={row.avatarStyle}
                  size="md"
                  className="!rounded-full"
                />
                <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
                  {isMe ? 'you' : firstNameFrom(row.name, 'Member')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CommunityDashboardTab({
  communityId,
  community,
  isAdmin,
  openAdminOnMount = false,
  onAdminOpenHandled,
}: CommunityDashboardTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [weekOffset, setWeekOffset] = useState(0);
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);
  const [contributionActivityId, setContributionActivityId] = useState<string>('overall');
  const [adminOpen, setAdminOpen] = useState(false);
  const [buddyMessage, setBuddyMessage] = useState<string | null>(null);
  const [buddyChatOpen, setBuddyChatOpen] = useState(false);

  useEffect(() => {
    if (!openAdminOnMount) return;
    setAdminOpen(true);
    onAdminOpenHandled?.();
  }, [openAdminOnMount, onAdminOpenHandled]);

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
    enabled: Boolean(
      weekViewQuery.isSuccess &&
        contributionActivityId === 'overall' &&
        (overallEmpty || membersLoggedCount === 0)
    ),
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
    }));
    return [{ value: 'overall', label: 'All' }, ...activityOptions];
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
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
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
              {weekLabel || 'This week'}
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
        </div>

        <div className="section-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Members</p>
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
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          disabled={!canGoPrevious || weekViewQuery.isFetching}
          onClick={() => {
            setDetailActivityId(null);
            setWeekOffset((v) => v - 1);
          }}
          aria-label="Previous week"
          className="text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-serif text-lg font-semibold leading-tight text-foreground">
            {weekLabel || 'This week'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isCurrent ? 'This week' : 'Past week'}
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
          className="text-primary"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {(upcomingQuery.data?.length || 0) > 0 ? (
        <div className="section-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Upcoming</p>
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
        <div className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: '#E8A838' }}
            >
              <HeartHandshake className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Buddy</p>
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
                        Stay consistent together
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
                  Bye this week
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  No buddy yet
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
                      description: 'Pairs will change for this week.',
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
                  Reshuffle
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
                label: 'target',
                value: formatCompactStat(analytics?.totalCommunityTarget ?? 0),
                icon: Target,
              },
              {
                label: 'done',
                value: formatCompactStat(
                  analytics?.totalCompleted ?? analytics?.totalValue ?? 0
                ),
                icon: Trophy,
              },
              {
                label: 'left',
                value: formatCompactStat(analytics?.remainingTarget ?? 0),
                icon: ChartColumnIncreasing,
              },
              {
                label: 'avg',
                value: `${Math.round(analytics?.averageProgressPerMember ?? 0)}%`,
                icon: Users,
              },
            ] as const;

            return (
              <>
                <section className="rounded-[1.5rem] border border-border bg-surface px-4 py-5 shadow-[var(--shadow-card)]">
                  <h2 className="text-center font-serif text-xl font-semibold leading-tight text-foreground">
                    How&apos;s the week going?
                  </h2>
                  <div className="mt-4 flex flex-col items-center">
                    <span
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ backgroundColor: mood.color }}
                    >
                      <MoodFace kind={mood.face} className="h-9 w-9" />
                    </span>
                    <p
                      className="mt-1.5 text-xs font-medium capitalize"
                      style={{ color: mood.color }}
                    >
                      {mood.label}
                    </p>
                    <div className="mt-3">
                      <ScoreRing percent={overallScore} size="lg" color={mood.color} />
                    </div>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      {membersLogged}/{memberCount} logged · {participationRate}%
                    </p>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {stats.map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="flex flex-col items-center gap-1.5">
                          <span
                            className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: STAT_COLORS[index] }}
                          >
                            <Icon className="h-5 w-5" strokeWidth={2} />
                          </span>
                          <span className="text-[11px] font-medium capitalize text-foreground">
                            {stat.label}
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-foreground">
                            {stat.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
                    <h2 className="font-serif text-lg font-semibold leading-tight text-foreground">
                      Everyone
                    </h2>
                    <CustomDropdown
                      value={contributionActivityId}
                      options={contributionFilterOptions}
                      disabled={weekViewQuery.isFetching || contributionFilterOptions.length <= 1}
                      onChange={(value) => setContributionActivityId(value)}
                      variant="pill"
                      align="right"
                      className="w-auto min-w-[7.5rem]"
                      aria-label="Filter"
                    />
                  </div>
                  <div className="px-4 pt-3 sm:px-5">
                    <MembersStrip
                      ranking={contributionRanking}
                      selectedProfileId={selectedProfile?._id}
                    />
                  </div>
                  <MemberContributionList
                    ranking={contributionRanking}
                    selectedProfileId={selectedProfile?._id}
                    resetKey={`${weekOffset}:${contributionActivityId}`}
                    loading={
                      contributionActivityId === 'overall' &&
                      (membersFallbackQuery.isLoading ||
                        (membersFallbackQuery.isFetching && contributionRanking.length === 0))
                    }
                    emptyLabel="No members yet"
                  />
                </section>
              </>
            );
          })()}

          {aiSummary?.text ? (
            <div className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
              <div>
                <p className="font-serif text-lg font-semibold text-foreground">This week</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{aiSummary.text}</p>
              </div>
              {aiSummary.highlights?.length ? (
                <ul className="mt-3 space-y-1.5">
                  {aiSummary.highlights.map((h) => (
                    <li key={h} className="text-xs text-muted-foreground">
                      · {h}
                    </li>
                  ))}
                </ul>
              ) : null}
              {aiSummary.recommendations?.length ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-foreground">Recommendations</p>
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

          <section className="overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-[var(--shadow-card)]">
            <div className="px-4 pt-4 pb-1 sm:px-5">
              <h2 className="font-serif text-lg font-semibold leading-tight text-foreground">
                Activities
              </h2>
            </div>
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
                        className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors hover:bg-secondary/50 sm:px-5"
                        onClick={() => setDetailActivityId(activity.activityId)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                            {activity.name}
                          </p>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                            {Math.round(activity.progressPercent)}%
                          </p>
                        </div>
                        <ProgressBar percent={activity.progressPercent} />
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {formatValue(activity.currentValue, activity.unit)}
                          {' / '}
                          {formatValue(activity.communityTarget, activity.unit)}
                        </p>
                        {aiNote ? (
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">{aiNote}</p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-5">
                No activities yet
              </p>
            )}
          </section>
        </>
      )}

      {isAdmin && isCurrent && community.status !== 'deleted' ? (
        <>
          <CollapsibleSection
            title="Admin"
            icon={Settings2}
            expanded={adminOpen}
            onToggle={() => setAdminOpen((value) => !value)}
            overflowVisible
            className="!rounded-[1.5rem]"
            contentClassName="space-y-3"
          >
            <CustomDropdown
              value={community.leaderboardMode}
              options={modeOptions}
              disabled={updateMode.isPending}
              onChange={(value) => updateMode.mutate(value as 'weekly' | 'monthly')}
              aria-label="Season"
            />
            <Button
              variant="outline"
              className="w-full justify-center"
              disabled={restart.isPending}
              onClick={() => {
                requestConfirm({
                  title: 'Reset the board?',
                  description: 'Monthly scores start over from now. Weekly stats stay the same.',
                  confirmLabel: 'Reset',
                  onConfirm: () => restart.mutateAsync(),
                });
              }}
            >
              {restart.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Reset board
            </Button>
          </CollapsibleSection>

          <CommunityAddMembersPanel communityId={communityId} />
        </>
      ) : null}

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        {DateTime.now().setZone('Asia/Kolkata').toFormat('ccc d LLL')}
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
