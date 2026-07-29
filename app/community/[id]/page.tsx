'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Pencil, Share2, Trash2, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/feed/NotificationBell';
import { CommunityDashboardTab } from '@/components/community/CommunityDashboardTab';
import { CommunityChatTab } from '@/components/community/CommunityChatTab';
import { CommunityFeedTab } from '@/components/community/CommunityFeedTab';
import { CommunityMembersTab } from '@/components/community/CommunityMembersTab';
import { CommunityAnnouncementsTab } from '@/components/community/CommunityAnnouncementsTab';
import { CommunityGroupsBadgesTab } from '@/components/community/CommunityGroupsBadgesTab';
import { CommunityCalendarTab } from '@/components/community/CommunityCalendarTab';
import { CommunityAppreciationTab } from '@/components/community/CommunityAppreciationTab';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { CommunityShareDialog } from '@/components/community/CommunityShareDialog';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import { communityAPI, communityTypeLabel } from '@/lib/api/community';

function apiErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const communityId = params.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [tab, setTab] = useState('dashboard');
  const [shareOpen, setShareOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'chat') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [tab]);

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
      setJoinError(null);
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
    onError: (err: unknown) => {
      setJoinError(apiErrorMessage(err, 'Could not join community'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => communityAPI.remove(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      router.replace('/community');
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => communityAPI.dismissDeleted(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      router.replace('/community');
    },
  });

  const community = communityQuery.data;
  const isDeleted = community?.status === 'deleted';
  const isAdmin = community?.myRole === 'admin';
  const isModerator = community?.myRole === 'moderator';
  const isMember = Boolean(community?.isMember);
  const isPending = community?.myMembershipStatus === 'pending';
  const canInvite =
    isMember &&
    !isDeleted &&
    (isAdmin ||
      community?.type === 'invite_only' ||
      community?.type === 'public' ||
      (community?.type === 'private' && isAdmin));

  const joinLabel =
    community?.type === 'private'
      ? 'Private — ask an admin to add you'
      : community?.type === 'public'
        ? 'Request to join'
        : 'Join community';

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
                  <p className="mt-1 inline-flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {community.memberCount} members
                    <span>· {communityTypeLabel(community.type)}</span>
                    {isAdmin
                      ? ' · Admin'
                      : isModerator
                        ? ' · Moderator'
                        : isMember
                          ? ' · Member'
                          : isPending
                            ? ' · Request pending'
                            : ''}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">Community not found</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isMember ? (
              <NotificationBell
                triggerClassName="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-secondary"
              />
            ) : null}
            {!isDeleted &&
            (isMember || community?.type === 'invite_only' || community?.type === 'public') ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Share community"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            ) : null}
            {isAdmin && !isDeleted ? (
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
                    requestConfirm({
                      title: 'Delete this community?',
                      description:
                        'Historical weeks stay available for members until they dismiss it. Delete is blocked if anyone has logged this week. This action cannot be undone.',
                      confirmLabel: 'Delete',
                      onConfirm: () => deleteMutation.mutateAsync(),
                    });
                  }}
                  aria-label="Delete community"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {community && isDeleted ? (
          <div className="rounded-xl border border-border bg-secondary/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">This community was deleted</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Past weekly history remains available to browse. Dismiss to hide it from My groups.
            </p>
            <Button
              className="mt-3 w-full"
              variant="outline"
              disabled={dismissMutation.isPending}
              onClick={() => dismissMutation.mutate()}
            >
              {dismissMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Dismiss from my list
            </Button>
          </div>
        ) : null}

        {!community ? null : isMember ? (
          <>
            <ChipTabs
              tabs={[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'feed', label: 'Feed' },
                { id: 'calendar', label: 'Calendar' },
                { id: 'announcements', label: 'News' },
                { id: 'groups', label: 'Groups' },
                { id: 'kudos', label: 'Kudos' },
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
                isAdmin={Boolean(isAdmin)}
              />
            ) : null}
            {tab === 'feed' ? <CommunityFeedTab communityId={communityId} /> : null}
            {tab === 'calendar' ? (
              <CommunityCalendarTab
                communityId={communityId}
                isModerator={Boolean(isModerator || isAdmin)}
              />
            ) : null}
            {tab === 'announcements' ? (
              <CommunityAnnouncementsTab
                communityId={communityId}
                isModerator={Boolean(isModerator || isAdmin)}
              />
            ) : null}
            {tab === 'groups' ? (
              <CommunityGroupsBadgesTab
                communityId={communityId}
                isAdmin={Boolean(isAdmin)}
              />
            ) : null}
            {tab === 'kudos' ? (
              <CommunityAppreciationTab communityId={communityId} />
            ) : null}
            {tab === 'chat' ? (
              <CommunityChatTab
                communityId={communityId}
                canModerate={Boolean(isAdmin || isModerator)}
              />
            ) : null}
            {tab === 'members' ? (
              <CommunityMembersTab
                communityId={communityId}
                community={community}
                isAdmin={Boolean(isAdmin)}
                isModerator={Boolean(isModerator || isAdmin)}
                canInvite={Boolean(canInvite)}
                onLeft={() => router.replace('/community')}
              />
            ) : null}
          </>
        ) : (
          <div className="section-card space-y-3 p-5 text-center">
            {isPending ? (
              <>
                <p className="text-sm font-semibold text-foreground">Request pending</p>
                <p className="text-sm text-muted-foreground">
                  An admin or moderator needs to approve your request before you can access this
                  community.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {community.type === 'private'
                    ? 'This community is private. Ask an admin to add you.'
                    : 'Join to see the dashboard, chat, and members.'}
                </p>
                {joinError ? (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {joinError}
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  disabled={joinMutation.isPending || community.type === 'private'}
                  onClick={() => {
                    setJoinError(null);
                    joinMutation.mutate();
                  }}
                >
                  {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {joinLabel}
                </Button>
              </>
            )}
          </div>
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
      {ConfirmDialogElement}
    </MainLayout>
  );
}
