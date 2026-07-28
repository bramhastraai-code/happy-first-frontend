'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Check, Loader2, Shield, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityAddMembersPanel } from '@/components/community/CommunityAddMembersPanel';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import {
  communityAPI,
  communityTypeLabel,
  type Community,
  type CommunityMember,
  type CommunityMemberRole,
} from '@/lib/api/community';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useAuthStore } from '@/lib/store/authStore';

interface CommunityMembersTabProps {
  communityId: string;
  community: Community;
  isAdmin: boolean;
  isModerator: boolean;
  canInvite: boolean;
  onLeft?: () => void;
}

function roleLabel(role: CommunityMemberRole) {
  if (role === 'admin') return 'Admin';
  if (role === 'moderator') return 'Moderator';
  return 'Member';
}

export function CommunityMembersTab({
  communityId,
  community,
  isAdmin,
  isModerator,
  canInvite,
  onLeft,
}: CommunityMembersTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();

  const invalidateMembership = () => {
    void queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community-join-requests', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community-blacklist', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community-dashboard', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community-add-people', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community-groups', communityId] });
  };

  const membersQuery = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async () => {
      const res = await communityAPI.members(communityId);
      return res.data.data.members ?? [];
    },
  });

  const groupsQuery = useQuery({
    queryKey: ['community-groups', communityId],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await communityAPI.groups(communityId);
      return res.data.data.groups ?? [];
    },
  });

  const requestsQuery = useQuery({
    queryKey: ['community-join-requests', communityId],
    enabled: isAdmin || isModerator,
    queryFn: async () => {
      const res = await communityAPI.joinRequests(communityId);
      return res.data.data.requests ?? [];
    },
  });

  const blacklistQuery = useQuery({
    queryKey: ['community-blacklist', communityId],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await communityAPI.blacklist(communityId);
      return res.data.data.members ?? [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.removeMember(communityId, profileId),
    onSuccess: () => invalidateMembership(),
  });

  const leaveMutation = useMutation({
    mutationFn: () => communityAPI.leave(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      onLeft?.();
    },
  });

  const approveMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.approveJoinRequest(communityId, profileId),
    onSuccess: () => invalidateMembership(),
  });

  const rejectMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.rejectJoinRequest(communityId, profileId),
    onSuccess: () => invalidateMembership(),
  });

  const blacklistMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.blacklistMember(communityId, profileId),
    onSuccess: () => invalidateMembership(),
  });

  const unblacklistMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.unblacklistMember(communityId, profileId),
    onSuccess: () => invalidateMembership(),
  });

  const roleMutation = useMutation({
    mutationFn: ({
      profileId,
      role,
    }: {
      profileId: string;
      role: CommunityMemberRole;
    }) => communityAPI.updateMemberRole(communityId, profileId, role),
    onSuccess: () => invalidateMembership(),
  });

  const groupMutation = useMutation({
    mutationFn: ({
      profileId,
      groupId,
    }: {
      profileId: string;
      groupId: string | null;
    }) => communityAPI.assignMemberGroup(communityId, profileId, groupId),
    onSuccess: () => invalidateMembership(),
  });

  const appreciateMutation = useMutation({
    mutationFn: (profileId: string) =>
      communityAPI.sendAppreciation(communityId, {
        toProfileId: profileId,
        type: 'kudos',
        contextType: 'general',
      }),
  });

  const members = membersQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const blacklisted = blacklistQuery.data ?? [];

  return (
    <div className="space-y-4">
      {canInvite ? (
        <CommunityAddMembersPanel
          communityId={communityId}
          title={community.type === 'private' ? 'Add member' : 'Invite member'}
        />
      ) : null}

      {(isAdmin || isModerator) && community.type === 'public' ? (
        <div className="section-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Join requests</p>
            <p className="text-xs text-muted-foreground">
              Approve or reject people requesting to join this {communityTypeLabel(community.type)}{' '}
              community
            </p>
          </div>
          {requestsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No pending requests
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {requests.map((request) => {
                const busy =
                  (approveMutation.isPending &&
                    approveMutation.variables === request.profile.id) ||
                  (rejectMutation.isPending && rejectMutation.variables === request.profile.id);
                return (
                  <li key={request.id} className="flex items-center gap-3 px-4 py-3">
                    <ProfileAvatar
                      name={request.profile.name}
                      avatarUrl={request.profile.avatarUrl}
                      avatarSeed={request.profile.avatarSeed}
                      avatarStyle={request.profile.avatarStyle}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{request.profile.name}</p>
                      <p className="text-[11px] text-muted-foreground">Pending approval</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => approveMutation.mutate(request.profile.id)}
                      >
                        {approveMutation.isPending &&
                        approveMutation.variables === request.profile.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => rejectMutation.mutate(request.profile.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <div className="section-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Members</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? 'Manage roles, remove, or blacklist members'
              : isModerator
                ? 'Moderators can review join requests'
                : `${members.length} people`}
          </p>
        </div>
        {membersQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const isMe = String(member.profile.id) === String(selectedProfile?._id);
              const removing =
                removeMutation.isPending && removeMutation.variables === member.profile.id;
              const blacklisting =
                blacklistMutation.isPending &&
                blacklistMutation.variables === member.profile.id;
              const canRemove = isAdmin && !isMe;
              return (
                <li key={member.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      name={member.profile.name}
                      avatarUrl={member.profile.avatarUrl}
                      avatarSeed={member.profile.avatarSeed}
                      avatarStyle={member.profile.avatarStyle}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {member.profile.name}
                        {isMe ? ' (you)' : ''}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {roleLabel(member.role)}
                        {member.group?.name ? ` · ${member.group.name}` : ''}
                      </p>
                    </div>
                    {!isMe ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 text-[11px]"
                        disabled={appreciateMutation.isPending}
                        onClick={() => appreciateMutation.mutate(member.profile.id)}
                      >
                        👏 Kudos
                      </Button>
                    ) : null}
                  </div>

                  {isAdmin && !isMe ? (
                    <div className="flex flex-wrap gap-1.5 pl-11">
                      <select
                        className="h-8 rounded-lg border border-input bg-secondary px-2 text-[11px] font-semibold"
                        value={member.role}
                        disabled={roleMutation.isPending}
                        onChange={(e) =>
                          roleMutation.mutate({
                            profileId: member.profile.id,
                            role: e.target.value as CommunityMemberRole,
                          })
                        }
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      {groups.length > 0 ? (
                        <select
                          className="h-8 max-w-[9rem] rounded-lg border border-input bg-secondary px-2 text-[11px] font-semibold"
                          value={member.groupId || ''}
                          disabled={groupMutation.isPending}
                          onChange={(e) =>
                            groupMutation.mutate({
                              profileId: member.profile.id,
                              groupId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">No group</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {canRemove ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={removeMutation.isPending || blacklistMutation.isPending}
                          onClick={() => {
                            requestConfirm({
                              title: `Remove ${member.profile.name}?`,
                              description:
                                'They will be removed from this community. This action cannot be undone.',
                              confirmLabel: 'Remove',
                              onConfirm: () => removeMutation.mutateAsync(member.profile.id),
                            });
                          }}
                        >
                          {removing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                          Remove
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={removeMutation.isPending || blacklistMutation.isPending}
                        onClick={() => {
                          requestConfirm({
                            title: `Blacklist ${member.profile.name}?`,
                            description:
                              'They will not be able to join again until unblocked. This action cannot be undone until you unblacklist them.',
                            confirmLabel: 'Blacklist',
                            onConfirm: () => blacklistMutation.mutateAsync(member.profile.id),
                          });
                        }}
                      >
                        {blacklisting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        Blacklist
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdmin ? (
        <div className="section-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Shield className="h-3.5 w-3.5" />
              Blacklist
            </p>
            <p className="text-xs text-muted-foreground">
              Blocked people cannot join until you unblacklist them
            </p>
          </div>
          {blacklistQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : blacklisted.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No blacklisted members
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {blacklisted.map((member: CommunityMember) => {
                const busy =
                  unblacklistMutation.isPending &&
                  unblacklistMutation.variables === member.profile.id;
                return (
                  <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                    <ProfileAvatar
                      name={member.profile.name}
                      avatarUrl={member.profile.avatarUrl}
                      avatarSeed={member.profile.avatarSeed}
                      avatarStyle={member.profile.avatarStyle}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{member.profile.name}</p>
                      <p className="text-[11px] text-muted-foreground">Blacklisted</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => unblacklistMutation.mutate(member.profile.id)}
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Unblacklist
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      <Button
        variant="outline"
        className="w-full"
        disabled={leaveMutation.isPending}
        onClick={() => {
          requestConfirm({
            title: 'Leave this community?',
            description:
              'You will lose access to chat and community activity until you rejoin. This cannot be undone from here.',
            confirmLabel: 'Leave',
            onConfirm: () => leaveMutation.mutateAsync(),
          });
        }}
      >
        {leaveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Leave community
      </Button>
      {ConfirmDialogElement}
    </div>
  );
}
