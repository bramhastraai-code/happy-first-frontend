'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Pencil, Share2, Trash2, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { Button } from '@/components/ui/button';
import { CommunityDashboardTab } from '@/components/community/CommunityDashboardTab';
import { CommunityChatTab } from '@/components/community/CommunityChatTab';
import { CommunityMembersTab } from '@/components/community/CommunityMembersTab';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { CommunityShareDialog } from '@/components/community/CommunityShareDialog';
import { communityAPI } from '@/lib/api/community';

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const communityId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [shareOpen, setShareOpen] = useState(false);

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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => communityAPI.remove(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      router.replace('/community');
    },
  });

  const community = communityQuery.data;
  const isAdmin = community?.myRole === 'admin';
  const isMember = Boolean(community?.isMember);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Link
            href="/community"
            className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            {communityQuery.isLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading…</span>
              </div>
            ) : community ? (
              <div className="flex items-start gap-3">
                <CommunityAvatar
                  name={community.name}
                  icon={community.icon}
                  avatarUrl={community.avatarUrl}
                  avatarSeed={community.avatarSeed}
                  avatarStyle={community.avatarStyle}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-bold text-foreground">{community.name}</h1>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {community.description ||
                      community.activities.map((a) => a.name).join(', ') ||
                      'Community'}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {community.memberCount} members
                    {isAdmin ? ' · Admin' : isMember ? ' · Member' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">Community not found</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isMember ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Share community"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            ) : null}
            {isAdmin ? (
              <>
                <Button asChild size="icon" variant="ghost" aria-label="Edit community">
                  <Link href={`/community/${communityId}/edit`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm('Delete this community permanently?')) {
                      deleteMutation.mutate();
                    }
                  }}
                  aria-label="Delete community"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {!community ? null : !isMember ? (
          <div className="section-card space-y-3 p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Join to see the dashboard, chat, and members.
            </p>
            <Button
              className="w-full"
              disabled={joinMutation.isPending}
              onClick={() => joinMutation.mutate()}
            >
              {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Join community
            </Button>
          </div>
        ) : (
          <>
            <ChipTabs
              tabs={[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'chat', label: 'Chat' },
                { id: 'members', label: 'Members' },
              ]}
              active={tab}
              onChange={setTab}
            />

            {tab === 'dashboard' ? (
              <CommunityDashboardTab
                communityId={communityId}
                community={community}
                isAdmin={isAdmin}
              />
            ) : null}
            {tab === 'chat' ? <CommunityChatTab communityId={communityId} /> : null}
            {tab === 'members' ? (
              <CommunityMembersTab
                communityId={communityId}
                isAdmin={isAdmin}
                onLeft={() => router.replace('/community')}
              />
            ) : null}
          </>
        )}
      </div>

      {community ? (
        <CommunityShareDialog
          communityId={communityId}
          communityName={community.name}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </MainLayout>
  );
}
