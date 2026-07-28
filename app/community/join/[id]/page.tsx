'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { communityAPI, communityTypeLabel } from '@/lib/api/community';

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
      <div className="mx-auto max-w-md space-y-4">
        <Link
          href="/community"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        {communityQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !community ? (
          <div className="section-card space-y-3 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">Invite not found</p>
            <p className="text-xs text-muted-foreground">
              This community link is invalid or the group was removed.
            </p>
            <Button asChild className="w-full">
              <Link href="/community">Browse communities</Link>
            </Button>
          </div>
        ) : (
          <div className="section-card space-y-4 p-6 text-center">
            <div className="flex justify-center">
              <CommunityAvatar
                name={community.name}
                icon={community.icon}
                avatarUrl={community.avatarUrl}
                avatarSeed={community.avatarSeed}
                avatarStyle={community.avatarStyle}
                size="lg"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{community.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {community.description ||
                  community.activities.map((a) => a.name).join(', ') ||
                  'Community invite'}
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {community.memberCount} members · {communityTypeLabel(community.type)}
              </p>
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
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
                  className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
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

            <Button
              className="w-full"
              disabled={joinDisabled}
              onClick={() => {
                setError(null);
                joinMutation.mutate();
              }}
            >
              {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {community.isMember ? 'Already a member' : joinLabel}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
