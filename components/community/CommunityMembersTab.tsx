'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Ban, Check, Contact, Loader2, Search, Shield, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityAddMembersPanel } from '@/components/community/CommunityAddMembersPanel';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import {
  communityAPI,
  communityTypeLabel,
  type Community,
  type CommunityMember,
  type CommunityMemberRole,
  type CommunityMemberSort,
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

function formatJoinedDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

type ContactLike = {
  name?: string[];
  tel?: string[];
};

function contactsApiAvailable() {
  if (typeof navigator === 'undefined') return false;
  const contacts = (navigator as Navigator & { contacts?: { select?: unknown } }).contacts;
  return Boolean(contacts && typeof contacts.select === 'function');
}

async function pickDeviceContacts(): Promise<ContactLike[]> {
  const contacts = (
    navigator as Navigator & {
      contacts?: {
        select: (
          props: string[],
          opts?: { multiple?: boolean }
        ) => Promise<ContactLike[]>;
      };
    }
  ).contacts;
  if (!contacts?.select) return [];
  return contacts.select(['name', 'tel'], { multiple: true });
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function CommunityMembersTab({
  communityId,
  community,
  isAdmin,
  isModerator,
  canInvite,
}: CommunityMembersTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [sort, setSort] = useState<CommunityMemberSort>('joinedAsc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [contactsBusy, setContactsBusy] = useState(false);
  const [contactsMessage, setContactsMessage] = useState<string | null>(null);
  const supportsContacts = useMemo(() => contactsApiAvailable(), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQ(searchInput.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

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
    queryKey: ['community-members', communityId, sort, searchQ],
    queryFn: async () => {
      const res = await communityAPI.members(communityId, {
        sort,
        q: searchQ || undefined,
      });
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

  const addMemberMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.addMember(communityId, { profileId }),
    onSuccess: () => invalidateMembership(),
  });

  const inviteFromContacts = async () => {
    if (!supportsContacts) {
      setContactsMessage('Contact picking is not supported on this device/browser.');
      return;
    }
    setContactsBusy(true);
    setContactsMessage(null);
    try {
      const picked = await pickDeviceContacts();
      if (!picked.length) {
        setContactsMessage('No contacts selected.');
        return;
      }

      const queries = new Set<string>();
      for (const contact of picked) {
        for (const name of contact.name || []) {
          const trimmed = name.trim();
          if (trimmed.length >= 2) queries.add(trimmed);
        }
        for (const tel of contact.tel || []) {
          const digits = normalizePhone(tel);
          if (digits.length >= 7) queries.add(digits.slice(-10));
        }
      }

      if (!queries.size) {
        setContactsMessage('Selected contacts had no usable name or phone.');
        return;
      }

      const matched = new Map<string, { profileId: string; name: string }>();
      for (const q of [...queries].slice(0, 12)) {
        try {
          const res = await communityAPI.searchMembers(communityId, q, { limit: 8 });
          for (const person of res.data.data.results || []) {
            matched.set(person.profileId, {
              profileId: person.profileId,
              name: person.name,
            });
          }
        } catch {
          // best-effort per contact query
        }
      }

      if (!matched.size) {
        setContactsMessage('No matching Happy First members found for those contacts.');
        return;
      }

      let added = 0;
      for (const person of matched.values()) {
        try {
          await addMemberMutation.mutateAsync(person.profileId);
          added += 1;
        } catch {
          // already a member or blocked
        }
      }
      setContactsMessage(
        added > 0
          ? `Invited ${added} member${added === 1 ? '' : 's'} from contacts.`
          : 'Matches found, but none could be added (already members or blocked).'
      );
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      if (name === 'AbortError' || name === 'NotAllowedError') {
        setContactsMessage('Contact access was cancelled.');
      } else {
        setContactsMessage('Could not read contacts on this device.');
      }
    } finally {
      setContactsBusy(false);
    }
  };

  const members = membersQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];
  const blacklisted = blacklistQuery.data ?? [];

  return (
    <div className="space-y-4">
      {canInvite ? (
        <>
          <CommunityAddMembersPanel
            communityId={communityId}
            title={community.type === 'private' ? 'Add member' : 'Invite member'}
          />
          {supportsContacts ? (
            <div className="section-card space-y-2 p-4">
              <Button
                variant="outline"
                className="w-full"
                disabled={contactsBusy || addMemberMutation.isPending}
                onClick={() => void inviteFromContacts()}
              >
                {contactsBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Contact className="h-4 w-4" />
                )}
                Invite from contacts
              </Button>
              {contactsMessage ? (
                <p className="text-xs text-muted-foreground">{contactsMessage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Match phone or name against Happy First members, then add them.
                </p>
              )}
            </div>
          ) : null}
        </>
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
                    <Link href={`/feed/profile/${request.profile.id}`} className="shrink-0">
                      <ProfileAvatar
                        name={request.profile.name}
                        avatarUrl={request.profile.avatarUrl}
                        avatarSeed={request.profile.avatarSeed}
                        avatarStyle={request.profile.avatarStyle}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/feed/profile/${request.profile.id}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {request.profile.name}
                      </Link>
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
        <div className="space-y-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Members</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? 'Manage roles, remove, or blacklist members'
                : isModerator
                  ? 'Moderators can review join requests'
                  : `${members.length} people`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search members…"
                className="h-9 w-full rounded-xl border border-input bg-secondary pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CommunityMemberSort)}
              className="h-9 rounded-xl border border-input bg-secondary px-3 text-xs font-semibold"
            >
              <option value="joinedAsc">Oldest joined</option>
              <option value="joinedDesc">Newest joined</option>
              <option value="nameAsc">Alphabetical</option>
            </select>
          </div>
        </div>
        {membersQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {searchQ ? 'No members match your search.' : 'No members yet.'}
          </p>
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
              const joinedLabel = formatJoinedDate(member.joinedAt);
              return (
                <li key={member.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/feed/profile/${member.profile.id}`} className="shrink-0">
                      <ProfileAvatar
                        name={member.profile.name}
                        avatarUrl={member.profile.avatarUrl}
                        avatarSeed={member.profile.avatarSeed}
                        avatarStyle={member.profile.avatarStyle}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/feed/profile/${member.profile.id}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {member.profile.name}
                        {isMe ? ' (you)' : ''}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {roleLabel(member.role)}
                        {member.group?.name ? ` · ${member.group.name}` : ''}
                        {joinedLabel ? ` · Joined ${joinedLabel}` : ''}
                        {member.profile.totalXp != null
                          ? ` · ${Number(member.profile.totalXp).toLocaleString()} XP`
                          : ''}
                        {member.profile.xpLevelTitle
                          ? ` · ${member.profile.xpLevelTitle}`
                          : ''}
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
                    <Link href={`/feed/profile/${member.profile.id}`} className="shrink-0">
                      <ProfileAvatar
                        name={member.profile.name}
                        avatarUrl={member.profile.avatarUrl}
                        avatarSeed={member.profile.avatarSeed}
                        avatarStyle={member.profile.avatarStyle}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/feed/profile/${member.profile.id}`}
                        className="truncate text-sm font-semibold hover:underline"
                      >
                        {member.profile.name}
                      </Link>
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

      {ConfirmDialogElement}
    </div>
  );
}
