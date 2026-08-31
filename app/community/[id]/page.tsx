'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  DoorOpen,
  Loader2,
  Pencil,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { Button } from '@/components/ui/button';
import {
  AppPageHeader,
  headerBackBtnClass,
} from '@/components/ui/AppPageHeader';
import { HeaderIconButton, HeaderOverflowMenu, type HeaderOverflowItem } from '@/components/ui/HeaderIconAction';
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
import { CommunityAboutMediaGallery } from '@/components/community/CommunityAboutMediaGallery';
import { CommunityShareDialog } from '@/components/community/CommunityShareDialog';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import { communityAPI, communityTypeLabel } from '@/lib/api/community';
import { useAuthStore } from '@/lib/store/authStore';

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
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const { selectedProfile } = useAuthStore();
  const [tab, setTab] = useState('dashboard');
  const [chatOpen, setChatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [soleAdminOpen, setSoleAdminOpen] = useState(false);
  const [assignAdminProfileId, setAssignAdminProfileId] = useState('');
  const [leaveBusy, setLeaveBusy] = useState(false);

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
    enabled: Boolean(communityId) && Boolean(community) && !isMember && !isPending,
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
      } else {
        setLeaveError(apiErrorMessage(err, 'Could not leave community'));
      }
    } finally {
      setLeaveBusy(false);
    }
  };

  const requestLeave = () => {
    requestConfirm({
      title: 'Leave this community?',
      description:
        'You will lose access to chat and community activity until you rejoin. This cannot be undone from here.',
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
  const createdOnLabel = formatCreatedOn(overview?.createdOn || community?.createdAt);

  const overflowItems: HeaderOverflowItem[] = [];
  if (isAdmin && !isDeleted && !isDisabled) {
    overflowItems.push({
      id: 'edit',
      label: 'Edit',
      icon: <Pencil />,
      href: `/community/${communityId}/edit`,
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

  return (
    <MainLayout hideBottomNav={chatOpen}>
      <div className="space-y-4">
        <AppPageHeader
          showAvatar={false}
          actionsPlacement="stack"
          leading={
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Link href="/community" className={`${headerBackBtnClass} -ml-1.5`} aria-label="Back">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              {community ? (
                <CommunityAvatar
                  name={community.name}
                  icon={community.icon}
                  avatarUrl={community.avatarUrl}
                  avatarSeed={community.avatarSeed}
                  avatarStyle={community.avatarStyle}
                  size="sm"
                  className="!h-10 !w-10 !rounded-2xl sm:!h-12 sm:!w-12"
                />
              ) : null}
            </div>
          }
          title={
            communityQuery.isLoading ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </span>
            ) : community ? (
              community.name
            ) : (
              <span className="text-destructive">Community not found</span>
            )
          }
          meta={
            community ? (
              <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                <span className="shrink-0">{communityTypeLabel(community.type)}</span>
                <span aria-hidden className="shrink-0">
                  ·
                </span>
                <Users className="h-3 w-3 shrink-0" />
                <span>
                  {community.memberCount}{' '}
                  {community.memberCount === 1 ? 'member' : 'members'}
                  {isAdmin
                    ? ' · Admin'
                    : isModerator
                      ? ' · Moderator'
                      : isMember
                        ? ' · Member'
                        : isPending
                          ? ' · Request pending'
                          : ''}
                  {community.pendingDisableAt
                    ? ` · Disables ${formatCreatedOn(community.pendingDisableAt) || 'soon'}`
                    : ''}
                </span>
              </span>
            ) : null
          }
          actions={
            <>
              {isMember ? <NotificationBell caption="Alerts" /> : null}
              {!isDeleted &&
              !isDisabled &&
              (isMember ||
                community?.type === 'invite_only' ||
                community?.type === 'public') ? (
                <HeaderIconButton
                  icon={<Share2 className="h-[18px] w-[18px]" />}
                  caption="Share"
                  onClick={() => setShareOpen(true)}
                />
              ) : null}
              <HeaderOverflowMenu items={overflowItems} />
            </>
          }
        />

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
          <div className="rounded-xl border border-border bg-secondary/60 px-4 py-3">
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
          <div className="rounded-xl border border-border bg-secondary/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">This community is disabled</p>
            <p className="mt-1 text-xs text-muted-foreground">
              It was disabled after the sole admin left. History may still be available.
            </p>
          </div>
        ) : null}

        {!community ? null : isMember ? (
          <>
            <ChipTabs
              tabs={[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'members', label: 'Members' },
                { id: 'feed', label: 'Feed' },
                { id: 'announcements', label: 'News' },
                { id: 'chat', label: 'Chat' },
                { id: 'kudos', label: 'Kudos' },
                { id: 'groups', label: 'Groups' },
                { id: 'calendar', label: 'Calendar' },
              ]}
              active={tab}
              onChange={(id) => {
                if (id === 'chat') {
                  setChatOpen(true);
                  return;
                }
                setTab(id);
              }}
            />

            {tab === 'dashboard' ? (
              <CommunityDashboardTab
                communityId={communityId}
                community={community}
                isAdmin={Boolean(isAdmin)}
              />
            ) : null}
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
        ) : (
          <div className="space-y-4">
            {isPending ? (
              <div className="section-card space-y-3 p-5 text-center">
                <p className="text-sm font-semibold text-foreground">Request pending</p>
                <p className="text-sm text-muted-foreground">
                  An admin or moderator needs to approve your request before you can access this
                  community.
                </p>
              </div>
            ) : (
              <>
                {discoverOverviewQuery.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="section-card space-y-4 p-5">
                    <div>
                      <p className="text-sm font-semibold text-foreground">About this community</p>
                      {createdOnLabel ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Created {createdOnLabel}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {overview?.description ||
                        community.description ||
                        'Join to see the dashboard, chat, and members.'}
                    </p>
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {overview?.memberCount ?? community.memberCount} members
                    </p>

                    {(overview?.aboutMedia?.length || community.aboutMedia?.length) ? (
                      <CommunityAboutMediaGallery
                        items={overview?.aboutMedia || community.aboutMedia || []}
                      />
                    ) : null}

                    {(overview?.activitiesTracked?.length || community.activities?.length) ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Activities
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {(overview?.activitiesTracked ||
                            community.activities.map((a) => ({
                              id: a.id,
                              name: a.name,
                              unit: a.baseUnit || '',
                            }))
                          ).map((a) => (
                            <li
                              key={a.id}
                              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground"
                            >
                              {a.name}
                              {a.unit ? ` · ${a.unit}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {overview?.weeklyTotals?.length ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          This week
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {overview.weeklyTotals.map((row) => (
                            <li
                              key={row.activityId}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-muted-foreground">{row.name}</span>
                              <span className="font-semibold tabular-nums">
                                {row.total}
                                {row.unit ? ` ${row.unit}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {overview?.overallTotals?.length ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Overall
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {overview.overallTotals.map((row) => (
                            <li
                              key={row.activityId}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-muted-foreground">{row.name}</span>
                              <span className="font-semibold tabular-nums">
                                {row.total}
                                {row.unit ? ` ${row.unit}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {(overview?.whyJoin?.text || community.joinWhyAi?.text) ? (
                      <div className="rounded-xl bg-primary-soft/60 px-3 py-3">
                        <p className="text-xs font-semibold text-foreground">Why join</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {overview?.whyJoin?.text || community.joinWhyAi?.text}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {community.type !== 'private' ? (
                  <div className="space-y-2">
                    <h2 className="section-title px-0.5">Community feed</h2>
                    <CommunityFeedTab communityId={communityId} readOnly />
                  </div>
                ) : null}

                <div className="section-card space-y-3 p-5 text-center">
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
                </div>
              </>
            )}
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
      {chatOpen && community ? (
        <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close chat"
            className="absolute inset-0 bg-black/50"
            onClick={() => setChatOpen(false)}
          />
          <div className="relative flex h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#efeae2] shadow-[var(--shadow-float)] sm:h-[78vh] sm:rounded-3xl">
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
            />
          </div>
        </div>
      ) : null}
      {ConfirmDialogElement}
    </MainLayout>
  );
}
