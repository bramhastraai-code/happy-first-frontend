'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  DoorOpen,
  Loader2,
  Pencil,
  Settings2,
  Share2,
  Trash2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  headerActionBtnClass,
  headerBackBtnClass,
  pageStickyHeaderClass,
} from '@/components/ui/AppPageHeader';
import { HeaderOverflowMenu, type HeaderOverflowItem } from '@/components/ui/HeaderIconAction';
import { NotificationBell } from '@/components/feed/NotificationBell';
import { CommunityDashboardTab } from '@/components/community/CommunityDashboardTab';
import { CommunityChatTab } from '@/components/community/CommunityChatTab';
import { CommunityFeedTab } from '@/components/community/CommunityFeedTab';
import { CommunityMembersTab } from '@/components/community/CommunityMembersTab';
import { CommunityAnnouncementsTab } from '@/components/community/CommunityAnnouncementsTab';
import { CommunityGroupsBadgesTab } from '@/components/community/CommunityGroupsBadgesTab';
import { CommunityCalendarTab } from '@/components/community/CommunityCalendarTab';
import { CommunityAppreciationTab } from '@/components/community/CommunityAppreciationTab';
import { CommunityShareDialog } from '@/components/community/CommunityShareDialog';
import { CommunityJoinPreview } from '@/components/community/CommunityJoinPreview';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { resolveDefaultLanding } from '@/lib/theme/mascotTheme';
import {
  COMMUNITY_SECTION_TITLES,
  CommunityHubShortcuts,
  type CommunityHubSection,
} from '@/components/community/CommunityHubShortcuts';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import { communityAPI, communityTypeLabel } from '@/lib/api/community';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

type CommunityPageTab = 'dashboard' | Exclude<CommunityHubSection, 'chat'>;

function apiErrorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  );
}

function apiErrorDetails(err: unknown): Record<string, unknown> {
  const data = (err as { response?: { data?: { error?: Record<string, unknown> } } })?.response
    ?.data?.error;
  return data && typeof data === 'object' ? data : {};
}

function formatCreatedOn(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const communityId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const { selectedProfile } = useAuthStore();
  const [tab, setTab] = useState<CommunityPageTab>('dashboard');
  const [openAdminControls, setOpenAdminControls] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [soleAdminOpen, setSoleAdminOpen] = useState(false);
  const [assignAdminProfileId, setAssignAdminProfileId] = useState('');
  const [leaveBusy, setLeaveBusy] = useState(false);

  useEffect(() => {
    const next = searchParams.get('tab');
    if (
      next === 'members' ||
      next === 'feed' ||
      next === 'announcements' ||
      next === 'kudos' ||
      next === 'groups' ||
      next === 'calendar' ||
      next === 'dashboard'
    ) {
      setTab(next);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!chatOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [chatOpen]);

  const communityQuery = useQuery({
    queryKey: ['community', communityId],
    enabled: Boolean(communityId),
    queryFn: async () => {
      const res = await communityAPI.get(communityId);
      return res.data.data.community;
    },
  });

  const community = communityQuery.data;
  const isDeleted = community?.status === 'deleted';
  const isDisabled = community?.status === 'disabled';
  const isAdmin = community?.myRole === 'admin';
  const isModerator = community?.myRole === 'moderator';
  const isMember = Boolean(community?.isMember);
  const isPending = community?.myMembershipStatus === 'pending';
  const canInvite =
    isMember &&
    !isDeleted &&
    !isDisabled &&
    (isAdmin ||
      community?.type === 'invite_only' ||
      community?.type === 'public' ||
      (community?.type === 'private' && isAdmin));

  const discoverOverviewQuery = useQuery({
    queryKey: ['community-discover-overview', communityId],
    enabled: Boolean(communityId) && Boolean(community) && !isMember,
    queryFn: async () => {
      const res = await communityAPI.discoverOverview(communityId);
      return res.data.data;
    },
  });

  const membersForLeaveQuery = useQuery({
    queryKey: ['community-members', communityId, 'leave-admin-pick'],
    enabled: soleAdminOpen,
    queryFn: async () => {
      const res = await communityAPI.members(communityId, { sort: 'nameAsc' });
      return res.data.data.members ?? [];
    },
  });

  const adminPickMembers = useMemo(() => {
    const me = String(selectedProfile?._id || '');
    return (membersForLeaveQuery.data ?? []).filter(
      (m) => String(m.profile.id) !== me
    );
  }, [membersForLeaveQuery.data, selectedProfile?._id]);

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
    onError: (err) => {
      setDeleteError(
        apiErrorMessage(
          err,
          'Could not delete this community. If members have already logged this week, wait until the weekly reset.'
        )
      );
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => communityAPI.dismissDeleted(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      router.replace('/community');
    },
  });

  const finishLeave = () => {
    void queryClient.invalidateQueries({ queryKey: ['communities'] });
    void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    router.replace('/community');
  };

  const runLeave = async (body?: {
    assignAdminProfileId?: string;
    acknowledgeDisable?: boolean;
  }) => {
    setLeaveBusy(true);
    setLeaveError(null);
    try {
      await communityAPI.leave(communityId, body);
      setSoleAdminOpen(false);
      finishLeave();
    } catch (err: unknown) {
      const details = apiErrorDetails(err);
      if (
        details.requiresAssignOrAcknowledge === true ||
        details.code === 'SOLE_ADMIN_LEAVE'
      ) {
        setSoleAdminOpen(true);
        setLeaveError(apiErrorMessage(err, 'Assign another admin or acknowledge disable.'));
        return;
      }
      setLeaveError(apiErrorMessage(err, 'Could not leave community'));
      throw err;
    } finally {
      setLeaveBusy(false);
    }
  };

  const requestLeave = () => {
    const soleAdminHint =
      isAdmin && community && community.memberCount > 1
        ? ' If you are the only admin, you must assign a replacement or the community will be disabled next week.'
        : '';
    requestConfirm({
      title: 'Leave this community?',
      description:
        `You will lose access to chat and community activity until you rejoin.${soleAdminHint}`,
      confirmLabel: 'Leave',
      onConfirm: () => runLeave(),
    });
  };

  const requestDelete = () => {
    requestConfirm({
      title: 'Delete this community?',
      description:
        'Historical weeks stay available for members until they dismiss it. Delete is blocked if anyone has logged this week. This action cannot be undone.',
      confirmLabel: 'Delete',
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  };

  const joinLabel =
    community?.type === 'private'
      ? 'Private — ask an admin to add you'
      : community?.type === 'public'
        ? 'Request to join'
        : 'Join community';

  const overview = discoverOverviewQuery.data;

  const overflowItems: HeaderOverflowItem[] = [];
  if (
    !isDeleted &&
    !isDisabled &&
    (isMember || community?.type === 'invite_only' || community?.type === 'public')
  ) {
    overflowItems.push({
      id: 'share',
      label: 'Share',
      icon: <Share2 />,
      onClick: () => setShareOpen(true),
    });
  }
  if (isAdmin && !isDeleted && !isDisabled) {
    overflowItems.push({
      id: 'edit',
      label: 'Edit',
      icon: <Pencil />,
      href: `/community/${communityId}/edit`,
    });
    overflowItems.push({
      id: 'admin',
      label: 'Admin',
      icon: <Settings2 />,
      onClick: () => {
        setTab('dashboard');
        setOpenAdminControls(true);
      },
    });
  }
  if (isMember && !isDeleted && !isDisabled) {
    overflowItems.push({
      id: 'leave',
      label: leaveBusy ? 'Leaving…' : 'Leave',
      icon: leaveBusy ? <Loader2 className="animate-spin" /> : <DoorOpen />,
      danger: true,
      disabled: leaveBusy,
      onClick: requestLeave,
    });
  }
  if (isAdmin && !isDeleted && !isDisabled) {
    overflowItems.push({
      id: 'delete',
      label: deleteMutation.isPending ? 'Deleting…' : 'Delete',
      icon: deleteMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />,
      danger: true,
      disabled: deleteMutation.isPending,
      onClick: requestDelete,
    });
  }

  const roleLabel = isAdmin
    ? 'Admin'
    : isModerator
      ? 'Moderator'
      : isMember
        ? 'Member'
        : isPending
          ? 'Request pending'
          : community
            ? communityTypeLabel(community.type)
            : '';

  const goHome = () => setTab('dashboard');
  const logoHref = resolveDefaultLanding(selectedProfile?.preferences?.defaultLanding);

  const openHubSection = (id: CommunityHubSection) => {
    if (id === 'chat') {
      setChatOpen(true);
      return;
    }
    setTab(id);
  };

  return (
    <MainLayout hideBottomNav={chatOpen} flushTop={Boolean(community && !isMember)}>
      <div className={community && !isMember ? '' : 'space-y-4'}>
        {isMember || !community ? (
        <header className={`${pageStickyHeaderClass} overflow-visible`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {tab === 'dashboard' ? (
              <Link href="/community" className={`${headerBackBtnClass} -ml-1.5`} aria-label="Back">
                <ChevronLeft className="h-6 w-6" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={goHome}
                className={`${headerBackBtnClass} -ml-1.5 text-primary`}
                aria-label="Back to community"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <BrandLogo href={logoHref} size="sm" className="shrink-0" />
            <div className="min-w-0 flex-1">
              {communityQuery.isLoading ? (
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </p>
              ) : tab !== 'dashboard' ? (
                <h1 className="font-serif text-lg font-semibold leading-tight text-foreground">
                  {COMMUNITY_SECTION_TITLES[tab]}
                </h1>
              ) : community ? (
                <>
                  <h1 className="font-serif text-[15px] font-semibold leading-tight text-foreground sm:text-lg">
                    {community.name}
                  </h1>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {community.memberCount}{' '}
                    {community.memberCount === 1 ? 'member' : 'members'}
                    {roleLabel ? ` · ${roleLabel}` : ''}
                    {community.pendingDisableAt
                      ? ` · Disables ${formatCreatedOn(community.pendingDisableAt) || 'soon'}`
                      : ''}
                  </p>
                </>
              ) : (
                <h1 className="font-serif text-[15px] font-semibold text-destructive">
                  Community not found
                </h1>
              )}
            </div>
            {isMember ? (
              <NotificationBell triggerClassName={`${headerActionBtnClass} relative`} />
            ) : null}
            {overflowItems.length ? (
              <HeaderOverflowMenu items={overflowItems} iconOnly />
            ) : null}
          </div>
        </header>
        ) : null}

        {leaveError && !soleAdminOpen ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {leaveError}
          </p>
        ) : null}
        {deleteError ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {deleteError}
          </p>
        ) : null}

        {community && isDeleted ? (
          <div className="px-1 py-2">
            <p className="text-sm font-semibold text-foreground">This community was deleted</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Past weekly history remains available to browse. Dismiss to hide it from Your
              Communities.
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

        {community && isDisabled ? (
          <div className="px-1 py-2">
            <p className="text-sm font-semibold text-foreground">This community is disabled</p>
            <p className="mt-1 text-xs text-muted-foreground">
              It was disabled after the sole admin left. History may still be available.
            </p>
          </div>
        ) : null}

        {!community ? null : isMember ? (
          <>
            {tab === 'dashboard' ? (
              <>
                {!isDeleted && !isDisabled ? (
                  <CommunityHubShortcuts onSelect={openHubSection} />
                ) : null}
                <CommunityDashboardTab
                  communityId={communityId}
                  community={community}
                  isAdmin={Boolean(isAdmin)}
                  openAdminOnMount={openAdminControls}
                  onAdminOpenHandled={() => setOpenAdminControls(false)}
                />
              </>
            ) : (
              <>
                {tab === 'members' ? (
                  <CommunityMembersTab
                    communityId={communityId}
                    community={community}
                    isAdmin={Boolean(isAdmin)}
                    isModerator={Boolean(isModerator || isAdmin)}
                    canInvite={Boolean(canInvite)}
                  />
                ) : null}
                {tab === 'feed' ? <CommunityFeedTab communityId={communityId} /> : null}
                {tab === 'announcements' ? (
                  <CommunityAnnouncementsTab
                    communityId={communityId}
                    isModerator={Boolean(isModerator || isAdmin)}
                  />
                ) : null}
                {tab === 'kudos' ? (
                  <CommunityAppreciationTab communityId={communityId} />
                ) : null}
                {tab === 'groups' ? (
                  <CommunityGroupsBadgesTab
                    communityId={communityId}
                    isAdmin={Boolean(isAdmin)}
                  />
                ) : null}
                {tab === 'calendar' ? (
                  <CommunityCalendarTab
                    communityId={communityId}
                    isModerator={Boolean(isModerator || isAdmin)}
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <CommunityJoinPreview
              community={community}
              overview={overview}
              pending={isPending}
              headerLeft={
                <Link
                  href="/community"
                  className={`${headerBackBtnClass} text-white hover:text-white`}
                  aria-label="Back"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Link>
              }
              headerRight={
                overflowItems.length ? (
                  <HeaderOverflowMenu
                    items={overflowItems}
                    iconOnly
                    triggerClassName="text-white hover:text-white"
                  />
                ) : null
              }
            />

            {!isPending ? (
            <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-20 -mx-4 mt-4 bg-background/95 px-4 pb-1 pt-3 backdrop-blur-md sm:-mx-6 sm:px-6">
              {joinError ? (
                <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                  {joinError}
                </p>
              ) : null}
              <Button
                className="h-12 w-full rounded-full text-base font-semibold shadow-none"
                disabled={joinMutation.isPending || community.type === 'private'}
                onClick={() => {
                  setJoinError(null);
                  joinMutation.mutate();
                }}
              >
                {joinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {joinLabel}
              </Button>
            </div>
            ) : null}
          </div>
        )}
      </div>

      {soleAdminOpen ? (
        <div className="fixed inset-0 z-[260] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40"
            disabled={leaveBusy}
            onClick={() => {
              if (!leaveBusy) {
                setSoleAdminOpen(false);
                setLeaveError(null);
              }
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-float)]"
          >
            <div>
              <h2 className="text-base font-semibold text-foreground">You are the only admin</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Assign another member as admin, or leave and acknowledge that this community will
                be disabled next week.
              </p>
            </div>
            {leaveError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {leaveError}
              </p>
            ) : null}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Assign new admin
              </label>
              {membersForLeaveQuery.isLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <select
                  value={assignAdminProfileId}
                  onChange={(e) => setAssignAdminProfileId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm"
                >
                  <option value="">Choose a member…</option>
                  {adminPickMembers.map((m) => (
                    <option key={m.profile.id} value={m.profile.id}>
                      {m.profile.name} ({m.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                disabled={!assignAdminProfileId || leaveBusy}
                onClick={() =>
                  void runLeave({ assignAdminProfileId })
                }
              >
                {leaveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Assign admin & leave
              </Button>
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                disabled={leaveBusy}
                onClick={() => void runLeave({ acknowledgeDisable: true })}
              >
                Leave & disable next week
              </Button>
              <Button
                variant="ghost"
                disabled={leaveBusy}
                onClick={() => {
                  setSoleAdminOpen(false);
                  setLeaveError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {community ? (
        <CommunityShareDialog
          communityId={communityId}
          communityName={community.name}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
      {chatOpen && community
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close chat"
                className="fixed inset-0 z-[209] hidden bg-black/40 md:block md:bg-black/20"
                onClick={() => setChatOpen(false)}
              />
              <div
                role="dialog"
                aria-label="Community chat"
                className={cn(
                  'fixed z-[210] flex w-full flex-col overflow-hidden bg-[#efeae2]',
                  'inset-0 h-[100dvh]',
                  'md:inset-auto md:left-1/2 md:top-[calc(4.5rem+env(safe-area-inset-top,0px))] md:h-[min(82dvh,44rem)] md:max-h-[calc(100dvh-5.5rem)] md:w-[24rem] md:-translate-x-1/2 md:rounded-2xl md:shadow-[var(--shadow-float)]'
                )}
              >
                <CommunityChatTab
                  communityId={communityId}
                  canModerate={Boolean(isAdmin || isModerator)}
                  embedded
                  communityName={community.name}
                  communityIcon={community.icon}
                  communityAvatarUrl={community.avatarUrl}
                  communityAvatarSeed={community.avatarSeed}
                  communityAvatarStyle={community.avatarStyle}
                  onBack={() => setChatOpen(false)}
                  onClose={() => setChatOpen(false)}
                />
              </div>
            </>,
            document.body
          )
        : null}
      {ConfirmDialogElement}
    </MainLayout>
  );
}
