'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2, Sparkles, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { communityAPI, communityTypeLabel } from '@/lib/api/community';
import { cn } from '@/lib/utils';

function apiErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

export default function CommunityJoinPage() {
  const params = useParams<{ id: string }>();
  const communityId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [groupId, setGroupId] = useState('');

  const communityQuery = useQuery({
    queryKey: ['community', communityId],
    enabled: Boolean(communityId),
    queryFn: async () => {
      const res = await communityAPI.get(communityId);
      return res.data.data.community;
    },
  });

  const groupsQuery = useQuery({
    queryKey: ['community-groups', communityId],
    enabled: Boolean(communityId) && communityQuery.data?.type === 'invite_only',
    queryFn: async () => {
      const res = await communityAPI.groups(communityId);
      return res.data.data.groups ?? [];
    },
  });

  const joinMutation = useMutation({
    mutationFn: () =>
      communityAPI.join(communityId, groupId ? { groupId } : undefined),
    onSuccess: (res) => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      const community = res.data.data.community;
      if (community.isMember || community.myMembershipStatus === 'pending') {
        router.replace(`/community/${communityId}`);
      }
    },
    onError: (err: unknown) => {
      setError(apiErrorMessage(err, 'Couldn’t join. Try again.'));
    },
  });

  const community = communityQuery.data;

  useEffect(() => {
    if (community?.isMember) {
      router.replace(`/community/${communityId}`);
    }
  }, [community?.isMember, communityId, router]);

  const joinDisabled =
    joinMutation.isPending ||
    Boolean(community?.isMember) ||
    community?.myMembershipStatus === 'pending' ||
    community?.type === 'private';

  const joinLabel =
    community?.myMembershipStatus === 'pending'
      ? 'Request pending'
      : community?.type === 'private'
        ? 'Private — ask an admin to add you'
        : community?.type === 'public'
          ? 'Request to join'
          : 'Join community';

  return (
    <MainLayout>
      <div className="relative mx-auto max-w-md overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 h-72">
          <div className="absolute left-4 top-6 h-40 w-40 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute right-0 top-16 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
        </div>

        <div className="relative space-y-4">
          <Link
            href="/community"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-xl',
              'bg-white/70 text-foreground shadow-sm backdrop-blur-xl',
              'transition hover:bg-white'
            )}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          {communityQuery.isLoading ? (
            <div
              className={cn(
                'flex justify-center rounded-[1.75rem] border border-white/50 bg-white/55 py-16',
                'shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl'
              )}
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !community ? (
            <div
              className={cn(
                'space-y-4 rounded-[1.75rem] border border-white/50 bg-white/65 p-6 text-center',
                'shadow-[0_16px_50px_rgba(15,23,42,0.1)] backdrop-blur-2xl'
              )}
            >
              <p className="text-base font-semibold text-foreground">Invite not found</p>
              <p className="text-xs text-muted-foreground">
                This community link is invalid or the group was removed.
              </p>
              <Link
                href="/community"
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-md"
              >
                Browse communities
              </Link>
            </div>
          ) : (
            <div
              className={cn(
                'space-y-5 rounded-[1.75rem] border border-white/55 bg-white/65 p-6 text-center',
                'shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl backdrop-saturate-150'
              )}
            >
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Community invite
              </div>

              <div className="flex justify-center">
                <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-2 shadow-sm">
                  <CommunityAvatar
                    name={community.name}
                    icon={community.icon}
                    avatarUrl={community.avatarUrl}
                    avatarSeed={community.avatarSeed}
                    avatarStyle={community.avatarStyle}
                    size="lg"
                  />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {community.name}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {community.description ||
                    community.activities.map((a) => a.name).join(', ') ||
                    'You’re invited to join this community'}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-md">
                  <Users className="h-3.5 w-3.5" />
                  {community.memberCount} members · {communityTypeLabel(community.type)}
                </p>
              </div>

              {error ? (
                <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              ) : null}

              {community.myMembershipStatus === 'pending' ? (
                <p className="text-xs text-muted-foreground">
                  Your request is waiting for admin or moderator approval.
                </p>
              ) : null}

              {community.type === 'invite_only' &&
              (groupsQuery.data?.length || 0) > 0 &&
              !community.isMember &&
              community.myMembershipStatus !== 'pending' ? (
                <div className="text-left">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Choose a group (optional)
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/70 bg-white/80 px-3 text-sm backdrop-blur-md outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">No group</option>
                    {groupsQuery.data?.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <button
                type="button"
                disabled={joinDisabled}
                onClick={() => {
                  setError(null);
                  joinMutation.mutate();
                }}
                className={cn(
                  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold',
                  'bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(0,0,0,0.16)]',
                  'transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {community.isMember ? 'Already a member' : joinLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
