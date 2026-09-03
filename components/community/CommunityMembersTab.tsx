'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Ban,
  Bell,
  Bot,
  Check,
  ChevronDown,
  Contact,
  Coins,
  DoorOpen,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Search,
  Shield,
  UserMinus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CommunityAddMembersPanel } from '@/components/community/CommunityAddMembersPanel';
import { CommunityReportsPanel } from '@/components/community/CommunityReportsPanel';
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
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { getCommunityJoinUrl } from '@/lib/community/share';

interface CommunityMembersTabProps {
  communityId: string;
  community: Community;
  isAdmin: boolean;
  isModerator: boolean;
  canInvite: boolean;
  onRequestLeave?: () => void;
  leaveBusy?: boolean;
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

function whatsAppDigits(countryCode?: string | null, phone?: string | null) {
  return `${countryCode || ''}${phone || ''}`.replace(/\D/g, '');
}

export function CommunityMembersTab({
  communityId,
  community,
  isAdmin,
  isModerator,
  canInvite,
  onRequestLeave,
  leaveBusy = false,
}: CommunityMembersTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [sort, setSort] = useState<CommunityMemberSort>('joinedAsc');
  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [contactsBusy, setContactsBusy] = useState(false);
  const [contactsMessage, setContactsMessage] = useState<string | null>(null);
  const [remindMessage, setRemindMessage] = useState<string | null>(null);
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    maxHeight: number;
    openUp: boolean;
  } | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const supportsContacts = useMemo(() => contactsApiAvailable(), []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQ(searchInput.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const placeMenu = (memberId: string) => {
    const trigger = menuTriggerRefs.current.get(memberId);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const bottomNavPad = 88; // glass nav + safe area
    const edgePad = 10;
    const availBelow = window.innerHeight - rect.bottom - bottomNavPad - edgePad;
    const availAbove = rect.top - edgePad;
    const openUp = availBelow < 220 && availAbove > availBelow;
    const maxHeight = Math.max(160, Math.min(320, openUp ? availAbove : availBelow));
    setMenuPos({
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
      right: Math.max(edgePad, window.innerWidth - rect.right),
      maxHeight,
      openUp,
    });
  };

  useEffect(() => {
    if (!menuMemberId) {
      setMenuPos(null);
      setRoleOpen(false);
      setGroupOpen(false);
      return;
    }
    placeMenu(menuMemberId);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      const triggerEl = menuTriggerRefs.current.get(menuMemberId);
      if (triggerEl?.contains(target)) return;
      setMenuMemberId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuMemberId(null);
    };
    const onReposition = () => placeMenu(menuMemberId);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [menuMemberId]);

  const invalidateMembership = () => {
    void queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community-join-requests', communityId] });
    void queryClient.invalidateQueries({ queryKey: ['community-invited', communityId] });
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

  const invitedQuery = useQuery({
    queryKey: ['community-invited', communityId],
    enabled: canInvite || isAdmin || isModerator,
    queryFn: async () => {
      const res = await communityAPI.invitedMembers(communityId);
      return res.data.data.members ?? [];
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

  const botInviteMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.sendInviteBotMessage(communityId, profileId),
    onSuccess: () => setRemindMessage('Invite sent via WhatsApp Bot'),
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not send bot message';
      setRemindMessage(message);
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
    onSuccess: () => {
      setRemindMessage('Kudos sent');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not send kudos';
      setRemindMessage(message);
    },
  });

  const remindMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.remindMember(communityId, profileId),
    onSuccess: (res) => {
      const data = res.data.data;
      const coins = Number(data.coinsEarned || 0);
      setRemindMessage(
        coins > 0
          ? `Reminder sent · +${coins} Happy Coin`
          : 'Reminder sent (coin already earned for this member this week)'
      );
      void queryClient.invalidateQueries({ queryKey: ['coins'] });
      void queryClient.invalidateQueries({ queryKey: ['community', communityId, 'members'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not send reminder';
      setRemindMessage(message);
    },
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
  const invited = invitedQuery.data ?? [];
  const blacklisted = blacklistQuery.data ?? [];

  const openPersonalInviteWhatsApp = (member: CommunityMember, kind: 'invited' | 'pending') => {
    const digits = whatsAppDigits(member.countryCode, member.phoneNumber);
    if (!digits) {
      setRemindMessage('No phone number on file for this person');
      return;
    }
    const joinUrl = getCommunityJoinUrl(communityId);
    const text = encodeURIComponent(
      kind === 'invited'
        ? `You're invited to join “${community.name}” on Happy First. Accept here: ${joinUrl}`
        : `Hi! About your request to join “${community.name}” on Happy First: ${joinUrl}`
    );
    window.open(`https://wa.me/${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

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

      {remindMessage ? (
        <div className="rounded-xl border border-border bg-primary-soft/50 px-3 py-2 text-xs font-medium text-foreground">
          {remindMessage}
        </div>
      ) : null}

      {(isAdmin || isModerator) ? (
        <CommunityReportsPanel communityId={communityId} />
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
                  <li key={request.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
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
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                      {request.canWhatsApp ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-w-0 px-2.5"
                            onClick={() => openPersonalInviteWhatsApp(request, 'pending')}
                            title="Message on personal WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Chat</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-w-0 px-2.5"
                            disabled={botInviteMutation.isPending}
                            onClick={() => botInviteMutation.mutate(request.profile.id)}
                            title="Send via WhatsApp Bot"
                          >
                            <Bot className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Bot</span>
                          </Button>
                        </>
                      ) : null}
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
                        aria-label="Reject"
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

      {(canInvite || isAdmin || isModerator) && invited.length > 0 ? (
        <div className="section-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Pending invitations</p>
            <p className="text-xs text-muted-foreground">
              Invited but not yet accepted · message via personal WhatsApp or Bot
            </p>
          </div>
          <ul className="divide-y divide-border">
            {invited.map((member) => {
              const sendingBot =
                botInviteMutation.isPending && botInviteMutation.variables === member.profile.id;
              return (
                <li key={member.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
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
                      <p className="text-[11px] text-muted-foreground">Pending acceptance</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                    {member.canWhatsApp ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-w-0 px-2.5"
                          onClick={() => openPersonalInviteWhatsApp(member, 'invited')}
                          title="Message on personal WhatsApp"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Chat</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-w-0 px-2.5"
                          disabled={botInviteMutation.isPending}
                          onClick={() => botInviteMutation.mutate(member.profile.id)}
                          title="Send via WhatsApp Bot"
                        >
                          {sendingBot ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Bot</span>
                        </Button>
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">No phone on file</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="section-card">
        <div className="space-y-3 border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? 'Manage roles, remove, or blacklist members'
              : isModerator
                ? 'Moderators can review join requests'
                : `${members.length} people`}
          </p>
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
            <CustomDropdown
              variant="pill"
              align="right"
              value={sort}
              aria-label="Sort members"
              onChange={(value) => setSort(value as CommunityMemberSort)}
              options={[
                { value: 'joinedAsc', label: 'Oldest joined' },
                { value: 'joinedDesc', label: 'Newest joined' },
                { value: 'nameAsc', label: 'Alphabetical' },
              ]}
              className="shrink-0 sm:self-auto"
            />
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
              const memberSinceLabel = formatJoinedDate(member.joinedAt);
              const menuOpen = menuMemberId === member.id;
              const showKudos = !isMe;
              const showWhatsAppInline = !isMe && member.canWhatsApp;
              const showActionsMenu =
                !isMe && (isAdmin || ((isAdmin || isModerator) && member.canRemind));

              return (
                <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/feed/profile/${member.profile.id}`} className="shrink-0">
                    <ProfileAvatar
                      name={member.profile.name}
                      avatarUrl={member.profile.avatarUrl}
                      avatarSeed={member.profile.avatarSeed}
                      avatarStyle={member.profile.avatarStyle}
                      size="sm"
                      rounded="xl"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/feed/profile/${member.profile.id}`}
                      className="truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {member.profile.name}
                      {isMe ? ' (you)' : ''}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {roleLabel(member.role)}
                      {member.group?.name ? ` · ${member.group.name}` : ''}
                      {memberSinceLabel ? ` · In community since ${memberSinceLabel}` : ''}
                      {member.isInactive ? ' · Inactive this week' : ''}
                    </p>
                  </div>

                  {showKudos || showWhatsAppInline || showActionsMenu ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {showKudos ? (
                        <button
                          type="button"
                          disabled={appreciateMutation.isPending}
                          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
                          aria-label={`Send kudos to ${member.profile.name}`}
                          title="Send kudos"
                          onClick={() => appreciateMutation.mutate(member.profile.id)}
                        >
                          <span aria-hidden className="text-sm">
                            👏
                          </span>
                          <span className="hidden sm:inline">Kudos</span>
                        </button>
                      ) : null}
                      {showWhatsAppInline ? (
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={`WhatsApp ${member.profile.name}`}
                          onClick={() => {
                            const digits = whatsAppDigits(member.countryCode, member.phoneNumber);
                            if (!digits) return;
                            const text = encodeURIComponent(
                              `Hi ${member.profile.name}! A note from ${community.name} on Happy First.`
                            );
                            window.open(
                              `https://wa.me/${digits}?text=${text}`,
                              '_blank',
                              'noopener,noreferrer'
                            );
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                      {showActionsMenu ? (
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) menuTriggerRefs.current.set(member.id, el);
                            else menuTriggerRefs.current.delete(member.id);
                          }}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label="Member actions"
                          aria-expanded={menuOpen}
                          onClick={() =>
                            setMenuMemberId((id) => (id === member.id ? null : member.id))
                          }
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      ) : null}
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

      {onRequestLeave ? (
        <div className="section-card p-4">
          <Button
            variant="outline"
            className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            disabled={leaveBusy}
            onClick={onRequestLeave}
          >
            {leaveBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DoorOpen className="h-4 w-4" />
            )}
            Leave community
          </Button>
        </div>
      ) : null}

      {typeof document !== 'undefined' && menuMemberId && menuPos
        ? createPortal(
            (() => {
              const member = members.find((m) => m.id === menuMemberId);
              if (!member) return null;
              const isMe = String(member.profile.id) === String(selectedProfile?._id);
              const canRemove = isAdmin && !isMe;
              const removing =
                removeMutation.isPending && removeMutation.variables === member.profile.id;
              const blacklisting =
                blacklistMutation.isPending &&
                blacklistMutation.variables === member.profile.id;
              const groupLabel =
                groups.find((g) => g.id === member.groupId)?.name || 'No group';

              return (
                <AnimatePresence>
                  <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.98, y: menuPos.openUp ? 4 : -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    style={{
                      position: 'fixed',
                      top: menuPos.top,
                      bottom: menuPos.bottom,
                      right: menuPos.right,
                      maxHeight: menuPos.maxHeight,
                      zIndex: 260,
                    }}
                    className="flex w-[min(16rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-md border border-border bg-white shadow-[0_10px_40px_rgb(28_25_23/0.22)]"
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                      {(isAdmin || isModerator) && member.canRemind && !isMe ? (
                        <button
                          type="button"
                          disabled={remindMutation.isPending}
                          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                          onClick={() => {
                            setMenuMemberId(null);
                            setRemindMessage(null);
                            remindMutation.mutate(member.profile.id);
                          }}
                        >
                          <Bell className="h-4 w-4 text-primary" />
                          <span className="min-w-0 flex-1">Remind inactive</span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700">
                            <Coins className="h-3 w-3" />
                            +1
                          </span>
                        </button>
                      ) : null}

                      {isAdmin ? (
                        <>
                          <div className="my-1 border-t border-border" />

                          {/* Role — collapsible */}
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary"
                            onClick={() => {
                              setRoleOpen((v) => !v);
                              if (!roleOpen) setGroupOpen(false);
                            }}
                            aria-expanded={roleOpen}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Role
                              </span>
                              <span className="block text-sm font-medium text-foreground">
                                {roleLabel(member.role)}
                              </span>
                            </span>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                roleOpen && 'rotate-180'
                              )}
                            />
                          </button>
                          {roleOpen ? (
                            <div className="bg-secondary/40 pb-1">
                              {(
                                [
                                  ['member', 'Member'],
                                  ['moderator', 'Moderator'],
                                  ['admin', 'Admin'],
                                ] as const
                              ).map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  disabled={roleMutation.isPending}
                                  className={cn(
                                    'flex w-full items-center gap-2 px-3.5 py-2 pl-5 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50',
                                    member.role === value
                                      ? 'font-semibold text-foreground'
                                      : 'font-medium text-foreground'
                                  )}
                                  onClick={() => {
                                    setMenuMemberId(null);
                                    if (member.role === value) return;
                                    roleMutation.mutate({
                                      profileId: member.profile.id,
                                      role: value,
                                    });
                                  }}
                                >
                                  <span className="min-w-0 flex-1">{label}</span>
                                  {member.role === value ? (
                                    <Check className="h-4 w-4 shrink-0 text-primary" />
                                  ) : null}
                                </button>
                              ))}
                            </div>
                          ) : null}

                          {groups.length > 0 ? (
                            <>
                              <div className="my-1 border-t border-border" />
                              {/* Group — collapsible */}
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary"
                                onClick={() => {
                                  setGroupOpen((v) => !v);
                                  if (!groupOpen) setRoleOpen(false);
                                }}
                                aria-expanded={groupOpen}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Group
                                  </span>
                                  <span className="block truncate text-sm font-medium text-foreground">
                                    {groupLabel}
                                  </span>
                                </span>
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                    groupOpen && 'rotate-180'
                                  )}
                                />
                              </button>
                              {groupOpen ? (
                                <div className="bg-secondary/40 pb-1">
                                  <button
                                    type="button"
                                    disabled={groupMutation.isPending}
                                    className="flex w-full items-center gap-2 px-3.5 py-2 pl-5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                                    onClick={() => {
                                      setMenuMemberId(null);
                                      if (!member.groupId) return;
                                      groupMutation.mutate({
                                        profileId: member.profile.id,
                                        groupId: null,
                                      });
                                    }}
                                  >
                                    <span className="min-w-0 flex-1">No group</span>
                                    {!member.groupId ? (
                                      <Check className="h-4 w-4 shrink-0 text-primary" />
                                    ) : null}
                                  </button>
                                  {groups.map((g) => (
                                    <button
                                      key={g.id}
                                      type="button"
                                      disabled={groupMutation.isPending}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 pl-5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                                      onClick={() => {
                                        setMenuMemberId(null);
                                        if (member.groupId === g.id) return;
                                        groupMutation.mutate({
                                          profileId: member.profile.id,
                                          groupId: g.id,
                                        });
                                      }}
                                    >
                                      <span className="min-w-0 flex-1 truncate">{g.name}</span>
                                      {member.groupId === g.id ? (
                                        <Check className="h-4 w-4 shrink-0 text-primary" />
                                      ) : null}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          ) : null}

                          <div className="my-1 border-t border-border" />
                          {canRemove ? (
                            <button
                              type="button"
                              disabled={
                                removeMutation.isPending || blacklistMutation.isPending
                              }
                              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                              onClick={() => {
                                setMenuMemberId(null);
                                requestConfirm({
                                  title: `Remove ${member.profile.name}?`,
                                  description: 'They will be removed from this community.',
                                  confirmLabel: 'Remove',
                                  onConfirm: () =>
                                    removeMutation.mutateAsync(member.profile.id),
                                });
                              }}
                            >
                              {removing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserMinus className="h-4 w-4 shrink-0" />
                              )}
                              Remove
                            </button>
                          ) : null}
                          {!isMe ? (
                          <button
                            type="button"
                            disabled={removeMutation.isPending || blacklistMutation.isPending}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                            onClick={() => {
                              setMenuMemberId(null);
                              requestConfirm({
                                title: `Blacklist ${member.profile.name}?`,
                                description:
                                  'They will not be able to join again until unblocked.',
                                confirmLabel: 'Blacklist',
                                onConfirm: () =>
                                  blacklistMutation.mutateAsync(member.profile.id),
                              });
                            }}
                          >
                            {blacklisting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4 shrink-0" />
                            )}
                            Blacklist
                          </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                </AnimatePresence>
              );
            })(),
            document.body
          )
        : null}

      {ConfirmDialogElement}
    </div>
  );
}
