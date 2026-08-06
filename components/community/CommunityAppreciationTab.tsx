'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { communityAPI } from '@/lib/api/community';
import { useAuthStore } from '@/lib/store/authStore';

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
          'Could not send appreciation'
      );
    },
  });

  const types = typesQuery.data ?? [];
  const members = (membersQuery.data ?? []).filter(
    (m) => String(m.profile.id) !== String(selectedProfile?._id)
  );
  const appreciations = listQuery.data?.pages.flatMap((p) => p.appreciations) ?? [];

  return (
    <div className="space-y-4">
      <div className="section-card grid grid-cols-2 divide-x divide-border p-4">
        <div className="pr-4">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{statsQuery.data?.received ?? 0}</p>
        </div>
        <div className="pl-4">
          <p className="text-xs text-muted-foreground">Given</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{statsQuery.data?.given ?? 0}</p>
        </div>
      </div>

      <div className="section-card space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Send appreciation</p>
        </div>
        <select
          value={toProfileId}
          onChange={(e) => setToProfileId(e.target.value)}
          className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
        >
          <option value="">Choose a member…</option>
          {members.map((m) => (
            <option key={m.profile.id} value={m.profile.id}>
              {m.profile.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => setType(t.code)}
              className={
                type === t.code
                  ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground'
                  : 'rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground'
              }
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional short message"
          maxLength={200}
          className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
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
      </div>

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
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No appreciations yet.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {appreciations.map((row) => {
                // Received = people who appreciated me (from); Given = people I appreciated (to)
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
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {row.emoji} {row.label}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatAppreciationDate(row.createdAt)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {direction === 'received' ? (
                          <>
                            From{' '}
                            <Link
                              href={`/feed/profile/${other.profileId}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {other.name}
                            </Link>
                          </>
                        ) : (
                          <>
                            To{' '}
                            <Link
                              href={`/feed/profile/${other.profileId}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {other.name}
                            </Link>
                          </>
                        )}
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

      <div className="section-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Appreciation leaderboard</p>
            <p className="text-xs text-muted-foreground">Most loved & most generous</p>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'weekly' | 'overall')}
            className="h-8 rounded-lg border border-input bg-secondary px-2 text-[11px] font-semibold"
          >
            <option value="overall">Overall</option>
            <option value="weekly">This week</option>
          </select>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">
              Received
            </p>
            <ul className="space-y-2">
              {(boardQuery.data?.received || []).slice(0, 5).map((row) => (
                <li key={row.profileId} className="flex justify-between text-xs">
                  <span className="truncate">{row.rank}. {row.name}</span>
                  <span className="font-semibold tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Given</p>
            <ul className="space-y-2">
              {(boardQuery.data?.given || []).slice(0, 5).map((row) => (
                <li key={row.profileId} className="flex justify-between text-xs">
                  <span className="truncate">{row.rank}. {row.name}</span>
                  <span className="font-semibold tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
