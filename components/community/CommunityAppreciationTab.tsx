'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { HappyIcon } from '@/components/ui/HappyIcon';
import { Button } from '@/components/ui/button';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { communityAPI } from '@/lib/api/community';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

interface CommunityAppreciationTabProps {
  communityId: string;
}

function formatAppreciationDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) {
    const mins = Math.max(1, Math.floor(diff / minute));
    return `${mins}m ago`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}h ago`;
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}d ago`;
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function CommunityAppreciationTab({ communityId }: CommunityAppreciationTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<'received' | 'given'>('received');
  const [period, setPeriod] = useState<'weekly' | 'overall'>('overall');
  const [toProfileId, setToProfileId] = useState('');
  const [type, setType] = useState('kudos');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: ['community-appreciation-types', communityId],
    queryFn: async () => {
      const res = await communityAPI.appreciationTypes(communityId);
      return res.data.data.types ?? [];
    },
  });

  const statsQuery = useQuery({
    queryKey: ['community-appreciation-stats', communityId],
    queryFn: async () => {
      const res = await communityAPI.appreciationStats(communityId);
      return res.data.data;
    },
  });

  const listQuery = useInfiniteQuery({
    queryKey: ['community-appreciations', communityId, direction],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await communityAPI.appreciations(communityId, {
        direction,
        cursor: pageParam,
        limit: 20,
      });
      return res.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const boardQuery = useQuery({
    queryKey: ['community-appreciation-lb', communityId, period],
    queryFn: async () => {
      const res = await communityAPI.appreciationLeaderboard(communityId, { period });
      return res.data.data;
    },
  });

  const membersQuery = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async () => {
      const res = await communityAPI.members(communityId);
      return res.data.data.members ?? [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      communityAPI.sendAppreciation(communityId, {
        toProfileId,
        type,
        message: message.trim(),
        contextType: 'general',
      }),
    onSuccess: () => {
      setMessage('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['community-appreciations', communityId] });
      void queryClient.invalidateQueries({
        queryKey: ['community-appreciation-stats', communityId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['community-appreciation-lb', communityId],
      });
      void queryClient.invalidateQueries({ queryKey: ['community-badges', communityId] });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not send'
      );
    },
  });

  const types = typesQuery.data ?? [];
  const members = (membersQuery.data ?? []).filter(
    (m) => String(m.profile.id) !== String(selectedProfile?._id)
  );
  const appreciations = listQuery.data?.pages.flatMap((p) => p.appreciations) ?? [];

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: String(m.profile.id),
        label: m.profile.name || 'Member',
      })),
    [members]
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="section-card overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="flex flex-col items-center px-3 py-4 text-center">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-xl font-bold tabular-nums tracking-tight text-foreground">
              {statsQuery.data?.received ?? 0}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Received</p>
          </div>
          <div className="flex flex-col items-center px-3 py-4 text-center">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-xl font-bold tabular-nums tracking-tight text-foreground">
              {statsQuery.data?.given ?? 0}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Given</p>
          </div>
        </div>
      </div>

      {/* Send */}
      <section className="section-card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <HappyIcon className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Send kudos</p>
        </div>

        <CustomDropdown
          value={toProfileId}
          placeholder="Choose member"
          onChange={setToProfileId}
          options={memberOptions}
          disabled={membersQuery.isLoading || members.length === 0}
          aria-label="Choose member"
        />

        {types.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => setType(t.code)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  type === t.code
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message (optional)"
          maxLength={200}
          className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <Button
          className="w-full"
          disabled={!toProfileId || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
        >
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send
        </Button>
      </section>

      {/* Activity */}
      <ChipTabs
        tabs={[
          { id: 'received', label: 'Received' },
          { id: 'given', label: 'Given' },
        ]}
        active={direction}
        onChange={(id) => setDirection(id as 'received' | 'given')}
      />

      <div className="section-card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : appreciations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No kudos yet</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {appreciations.map((row) => {
                const other = direction === 'received' ? row.from : row.to;
                return (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/feed/profile/${other.profileId}`} className="shrink-0">
                      <ProfileAvatar
                        name={other.name}
                        avatarUrl={other.avatarUrl}
                        avatarSeed={other.avatarSeed}
                        avatarStyle={other.avatarStyle}
                        size="sm"
                        rounded="xl"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {row.emoji} {row.label}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatAppreciationDate(row.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        <Link
                          href={`/feed/profile/${other.profileId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {other.name}
                        </Link>
                        {row.message ? ` · ${row.message}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {listQuery.hasNextPage ? (
              <div className="border-t border-border p-3">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={listQuery.isFetchingNextPage}
                  onClick={() => void listQuery.fetchNextPage()}
                >
                  {listQuery.isFetchingNextPage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Leaderboard */}
      <section className="section-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Leaderboard</h2>
          <CustomDropdown
            variant="pill"
            align="right"
            value={period}
            aria-label="Leaderboard period"
            onChange={(value) => setPeriod(value as 'weekly' | 'overall')}
            options={[
              { value: 'overall', label: 'Overall' },
              { value: 'weekly', label: 'This week' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
          <div className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Received
            </p>
            {boardQuery.isLoading ? (
              <Loader2 className="mx-auto my-4 h-4 w-4 animate-spin text-muted-foreground" />
            ) : (boardQuery.data?.received || []).length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-2">
                {(boardQuery.data?.received || []).slice(0, 5).map((row) => (
                  <li key={row.profileId} className="flex justify-between gap-2 text-xs">
                    <Link
                      href={`/feed/profile/${row.profileId}`}
                      className="min-w-0 truncate font-medium text-foreground hover:underline"
                    >
                      {row.rank}. {row.name}
                    </Link>
                    <span className="shrink-0 font-semibold tabular-nums text-primary">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Given
            </p>
            {boardQuery.isLoading ? (
              <Loader2 className="mx-auto my-4 h-4 w-4 animate-spin text-muted-foreground" />
            ) : (boardQuery.data?.given || []).length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-2">
                {(boardQuery.data?.given || []).slice(0, 5).map((row) => (
                  <li key={row.profileId} className="flex justify-between gap-2 text-xs">
                    <Link
                      href={`/feed/profile/${row.profileId}`}
                      className="min-w-0 truncate font-medium text-foreground hover:underline"
                    >
                      {row.rank}. {row.name}
                    </Link>
                    <span className="shrink-0 font-semibold tabular-nums text-primary">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
