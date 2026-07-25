'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { communityAPI } from '@/lib/api/community';

export default function CommunityJoinPage() {
  const params = useParams<{ id: string }>();
  const communityId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const communityQuery = useQuery({
    queryKey: ['community', communityId],
    enabled: Boolean(communityId),
    queryFn: async () => {
      const res = await communityAPI.get(communityId);
      return res.data.data.community;
    },
  });

  const joinMutation = useMutation({
    mutationFn: () => communityAPI.join(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      router.replace(`/community/${communityId}`);
    },
  });

  const community = communityQuery.data;

  useEffect(() => {
    if (community?.isMember) {
      router.replace(`/community/${communityId}`);
    }
  }, [community?.isMember, communityId, router]);

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
                {community.memberCount} members
              </p>
            </div>

            {joinMutation.isError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Couldn’t join. Try again.
              </p>
            ) : null}

            <Button
              className="w-full"
              disabled={joinMutation.isPending || community.isMember}
              onClick={() => joinMutation.mutate()}
            >
              {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {community.isMember ? 'Already a member' : 'Join community'}
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
