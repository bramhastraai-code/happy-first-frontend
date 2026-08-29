import api from './axios';

export type CommunityType = 'public' | 'private' | 'invite_only';
export type CommunityMemberRole = 'admin' | 'moderator' | 'member';
export type CommunityMemberStatus =
  | 'active'
  | 'pending'
  | 'invited'
  | 'blacklisted'
  | 'removed'
  | 'left';
export type CommunityActivityLevel = 'beginner' | 'active' | 'champion';

export interface CommunityActivity {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  baseUnit: string | null;
}

export interface CommunityActivityConfigItem {
  activity: CommunityActivity;
  activityId: string;
  level: CommunityActivityLevel;
  weeklyTarget: number;
  unit: string;
}

export interface CommunityAboutMediaItem {
  url: string;
  mediaType: 'image' | 'video';
  storage?: string | null;
  storageKey?: string | null;
  caption?: string;
  createdAt?: string | null;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  activities: CommunityActivity[];
  activityConfig?: CommunityActivityConfigItem[];
  pendingActivityConfig?: CommunityActivityConfigItem[];
  categories: string[];
  memberCount: number;
  type: CommunityType;
  isPublic: boolean;
  status?: 'active' | 'deleted' | 'disabled';
  deletedAt?: string | null;
  pendingDisableAt?: string | null;
  disabledAt?: string | null;
  currentWeekStart?: string | null;
  activityConfigLocked?: boolean;
  hasPendingActivityConfig?: boolean;
  leaderboardMode: 'weekly' | 'monthly';
  overallResetAt: string;
  createdAt: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  icon?: string | null;
  aboutMedia?: CommunityAboutMediaItem[];
  allowAdminWhatsApp?: boolean;
  allowMemberWhatsApp?: boolean;
  joinWhyAi?: {
    text: string;
    generatedAt?: string | null;
    source?: string | null;
  } | null;
  createdBy: {
    userId: string;
    profileId: string;
    name: string;
  };
  myRole: CommunityMemberRole | null;
  isMember: boolean;
  myMembershipStatus: CommunityMemberStatus | null;
  hiddenDeleted?: boolean;
}

export type CommunityMemberSort = 'joinedAsc' | 'joinedDesc' | 'nameAsc';

export interface CommunityDiscoverOverview {
  community: Community;
  createdOn: string;
  description: string;
  memberCount: number;
  aboutMedia?: CommunityAboutMediaItem[];
  activitiesTracked: Array<{ id: string; name: string; unit: string }>;
  weeklyTotals: Array<{ activityId: string; name: string; unit: string; total: number }>;
  overallTotals: Array<{ activityId: string; name: string; unit: string; total: number }>;
  whyJoin: { text: string; source?: string | null };
}

export interface CommunityWeekSummary {
  id: string;
  communityId: string;
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  weekYear: number;
  label: string;
  memberCount?: number;
  membersLogged?: number;
  totalValue?: number;
  totalPoints?: number;
  isCurrent?: boolean;
}

export interface MyCommunityActivity {
  activityId: string;
  name: string;
  label: string;
  category: string | null;
  icon: string | null;
  unit: string;
  baseUnit: string;
  level: CommunityActivityLevel;
  weeklyTarget: number;
  targetValue: number;
  cadence: 'daily' | 'weekly';
  communityIds: string[];
  communityNames: string[];
  isCommunityOnly: true;
  TodayLogged?: boolean;
}

export const COMMUNITY_ACTIVITY_LEVEL_OPTIONS: Array<{
  value: CommunityActivityLevel;
  label: string;
}> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'active', label: 'Active' },
  { value: 'champion', label: 'Champion' },
];

export interface CommunityMember {
  id: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  joinedAt: string;
  requestedAt?: string | null;
  statusChangedAt?: string | null;
  groupId?: string | null;
  group?: {
    id: string;
    name: string;
    description?: string;
  } | null;
  userId: string;
  profile: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
    totalXp?: number;
    xpLevel?: number;
    xpLevelTitle?: string;
    memberSince?: string | null;
    createdAt?: string | null;
  };
  canWhatsApp?: boolean;
  phoneNumber?: string | null;
  countryCode?: string | null;
  /** Present for admins/mods — no community activity logged this week */
  isInactive?: boolean;
  canRemind?: boolean;
}

export interface CommunityGroup {
  id: string;
  communityId: string;
  name: string;
  description: string;
  sortOrder: number;
  memberCount: number;
  createdAt?: string;
}

export interface CommunityAnnouncement {
  id: string;
  communityId: string;
  title: string;
  body: string;
  status: 'draft' | 'published';
  pinned: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  author: {
    profileId: string;
    name: string;
  };
}

export interface CommunityBadge {
  id?: string;
  code: string;
  label: string;
  description: string;
  unlockedAt?: string;
  unlocked?: boolean;
}

export type CommunityEventType =
  | 'yoga'
  | 'walkathon'
  | 'meeting'
  | 'challenge'
  | 'health_camp'
  | 'gathering'
  | 'other';

export type CommunityRsvpStatus = 'going' | 'interested' | 'not_going';

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  eventType: CommunityEventType | string;
  startsAt: string;
  endsAt?: string | null;
  location?: string;
  meetingLink?: string;
  bannerUrl?: string | null;
  groupId?: string | null;
  group?: { id: string; name: string } | null;
  status: string;
  rsvpCounts: { going: number; interested: number; not_going: number };
  myRsvp?: CommunityRsvpStatus | null;
  createdAt?: string;
  creator?: { profileId: string; name: string };
  isChallengeVirtual?: boolean;
}

export type CommunityAppreciationTypeCode =
  | 'kudos'
  | 'congratulations'
  | 'keep_going'
  | 'superstar'
  | 'amazing'
  | 'champion'
  | 'well_done';

export interface CommunityAppreciationType {
  code: CommunityAppreciationTypeCode | string;
  emoji: string;
  label: string;
}

export interface CommunityAppreciation {
  id: string;
  communityId: string;
  type: string;
  emoji: string;
  label: string;
  message: string;
  createdAt: string;
  from: {
    profileId: string;
    name: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  };
  to: {
    profileId: string;
    name: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  };
}

export interface CommunityMessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface CommunityMessageMention {
  type: 'profile' | 'role';
  profileId?: string | null;
  role?: 'admin' | 'moderator' | null;
}

export type CommunityMessageType = 'text' | 'poll' | 'share_card';
export type CommunityMediaType = 'image' | 'video' | 'document' | 'audio';
export type CommunityShareCardKind =
  | 'activity_complete'
  | 'badge'
  | 'leaderboard_rank'
  | 'milestone'
  | 'weekly_goal'
  | 'challenge';

export interface CommunityPollOption {
  id: string;
  text: string;
  voteCount: number;
  votedByMe: boolean;
  voters?: Array<{
    profileId: string;
    userId?: string | null;
    name?: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  }>;
}

export interface CommunityPoll {
  question: string;
  options: CommunityPollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  closesAt?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  closed: boolean;
  totalVotes: number;
}

export interface CommunityShareCard {
  kind: CommunityShareCardKind;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
  href?: string | null;
}

export interface CommunityReplyPreview {
  id: string;
  text: string;
  senderName: string;
  messageType?: CommunityMessageType;
  mediaType?: CommunityMediaType | null;
}

export interface CommunityMessage {
  id: string;
  communityId: string;
  text: string;
  messageType?: CommunityMessageType;
  mediaUrl?: string | null;
  mediaType?: CommunityMediaType | null;
  fileName?: string | null;
  mimeType?: string | null;
  deletedForEveryone?: boolean;
  createdAt: string;
  pinned?: boolean;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  reactions?: CommunityMessageReaction[];
  myReaction?: string | null;
  mentions?: CommunityMessageMention[];
  replyTo?: CommunityReplyPreview | null;
  replyCount?: number;
  poll?: CommunityPoll | null;
  shareCard?: CommunityShareCard | null;
  sender: {
    userId: string;
    profileId: string;
    name: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  };
}

export interface CommunitySharedMediaItem {
  id: string;
  messageId: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'link';
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  mediaType?: CommunityMediaType | null;
  text?: string;
  createdAt: string;
  sender: CommunityMessage['sender'];
}

export type CommunityMessageSendExtras = {
  mentionProfileIds?: string[];
  mentionRoles?: Array<'admin' | 'moderator'>;
  replyTo?: string | null;
  messageType?: CommunityMessageType;
  poll?: {
    question: string;
    options: string[];
    allowMultiple?: boolean;
    anonymous?: boolean;
    closesAt?: string | null;
  };
  shareCard?: {
    kind: CommunityShareCardKind;
    title: string;
    subtitle?: string;
    meta?: Record<string, unknown>;
    href?: string | null;
  };
};

export interface CommunityLeaderboardRow {
  profileId: string;
  name: string;
  role: CommunityMemberRole;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  points: number;
  totalValue?: number;
  contributionPercent?: number;
  rank: number;
}

export interface CommunityActivityProgress {
  activityId: string;
  name: string;
  unit: string;
  level: CommunityActivityLevel;
  currentValue: number;
  weeklyTarget: number;
  communityTarget: number;
  progressPercent: number;
}

export interface CommunityAnalytics {
  overallCommunityScore: number;
  participation: {
    membersLogged: number;
    memberCount: number;
    rate: number;
    label: string;
  };
  activities: CommunityActivityProgress[];
  totalValue: number;
  totalCommunityTarget?: number;
  totalCompleted?: number;
  remainingTarget?: number;
  averageProgressPerMember?: number;
}

export interface CommunityAiSummary {
  text: string;
  highlights: string[];
  recommendations: string[];
  generatedAt?: string | null;
  source?: string | null;
}

export interface CommunityActivityAiNote {
  activityId: string;
  activityName: string;
  note: string;
  tone?: string;
}

export interface CommunityDashboard {
  community: Community;
  range: {
    start: string;
    end: string;
    label: string;
    period: 'weekly' | 'monthly';
    week: number | null;
    month: string;
    overallResetAt: string | null;
  };
  overall: CommunityLeaderboardRow[];
  byActivity: Array<{
    activity: CommunityActivity;
    ranking: CommunityLeaderboardRow[];
    weeklyTarget?: number;
    communityTarget?: number;
    level?: CommunityActivityLevel;
    unit?: string;
    totalValue?: number;
    totalPoints?: number;
    progressPercent?: number;
  }>;
  myOverall: CommunityLeaderboardRow | null;
  memberCount: number;
  analytics?: CommunityAnalytics;
}

export interface ProfileSearchResult {
  profileId: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  sameActivity?: boolean;
  sameLocation?: boolean;
  sameLevel?: boolean;
  matchLabel?: string | null;
}

export interface ProfileSearchPage {
  results: ProfileSearchResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

type Envelope<T> = { data: T };

export const COMMUNITY_TYPE_OPTIONS: Array<{
  value: CommunityType;
  label: string;
  description: string;
}> = [
  {
    value: 'public',
    label: 'Public',
    description: 'Listed on Discover. People request to join; admin/moderator approve.',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Hidden from Discover. Only admins can add members.',
  },
  {
    value: 'invite_only',
    label: 'Invite only',
    description: 'Hidden from Discover. Members can invite others via link or add.',
  },
];

export function communityTypeLabel(type?: CommunityType | string | null) {
  if (type === 'private') return 'Private';
  if (type === 'invite_only') return 'Invite only';
  return 'Public';
}

export const communityAPI = {
  list: (params?: { q?: string; category?: string }) =>
    api.get<Envelope<{ communities: Community[] }>>('/community', { params }),

  mine: () => api.get<Envelope<{ communities: Community[] }>>('/community/mine'),

  myInvites: () =>
    api.get<Envelope<{ communities: Community[] }>>('/community/my-invites'),

  myActivities: (params?: { date?: string }) =>
    api.get<Envelope<{ activities: MyCommunityActivity[] }>>('/community/my-activities', {
      params,
    }),

  targetDefaults: () =>
    api.get<
      Envelope<{
        defaults: Record<
          string,
          {
            activityId: string;
            name: string;
            unit: string;
            beginner: number;
            active: number;
            champion: number;
          }
        >;
      }>
    >('/community/target-defaults'),

  activityPicker: (communityId?: string | null) =>
    api.get<
      Envelope<{
        activities: Array<{
          _id: string;
          id: string;
          name: string;
          baseUnit: string;
          category: string | null;
          icon: string | null;
          allowedCadence: Array<'daily' | 'weekly'>;
          isCustom?: boolean;
          communityId?: string | null;
        }>;
      }>
    >('/community/activity-picker', {
      params: communityId ? { communityId } : undefined,
    }),

  createCustomActivity: (
    id: string,
    payload: {
      name: string;
      baseUnit: string;
      description?: string;
      category?: string;
      icon?: string;
      allowedCadence?: Array<'daily' | 'weekly'>;
      level?: CommunityActivityLevel;
      defaultTarget?: number | null;
    }
  ) =>
    api.post<
      Envelope<{
        activity: { id: string; _id: string; name: string; baseUnit: string };
        level: CommunityActivityLevel;
        weeklyTarget: number;
      }>
    >(`/community/${id}/custom-activities`, payload),

  reportContent: (payload: {
    targetType: 'community_message' | 'feed_comment';
    targetId: string;
    reason: string;
    note?: string;
  }) => api.post<Envelope<{ report: { id: string } }>>('/community/reports', payload),

  communityReports: (id: string, params?: { status?: string }) =>
    api.get<
      Envelope<{
        reports: Array<{
          id: string;
          targetType: string;
          targetId: string;
          reason: string;
          note: string;
          status: string;
          createdAt: string;
          reporter: { profileId: string; name: string };
          preview?: string | null;
        }>;
      }>
    >(`/community/${id}/reports`, { params }),

  updateReport: (id: string, reportId: string, status: 'open' | 'reviewed' | 'dismissed') =>
    api.patch<Envelope<{ report: { id: string; status: string } }>>(
      `/community/${id}/reports/${reportId}`,
      { status }
    ),

  get: (id: string) =>
    api.get<Envelope<{ community: Community }>>(`/community/${id}`),

  discoverOverview: (id: string) =>
    api.get<Envelope<CommunityDiscoverOverview>>(`/community/${id}/discover-overview`),

  create: (payload: {
    name: string;
    description?: string;
    activityIds?: string[];
    activityConfig?: Array<{ activityId: string; level: CommunityActivityLevel }>;
    customActivities?: Array<{
      name: string;
      baseUnit: string;
      description?: string;
      category?: string;
      icon?: string;
      allowedCadence?: Array<'daily' | 'weekly'>;
      level?: CommunityActivityLevel;
      defaultTarget?: number | null;
    }>;
    type?: CommunityType;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
    icon?: string | null;
  }) => api.post<Envelope<{ community: Community }>>('/community', payload),

  update: (
    id: string,
    payload: {
      name?: string;
      description?: string;
      activityIds?: string[];
      activityConfig?: Array<{ activityId: string; level: CommunityActivityLevel }>;
      clearPendingActivityConfig?: boolean;
      type?: CommunityType;
      leaderboardMode?: 'weekly' | 'monthly';
      avatarUrl?: string | null;
      avatarSeed?: string | null;
      avatarStyle?: string | null;
      icon?: string | null;
      allowAdminWhatsApp?: boolean;
      allowMemberWhatsApp?: boolean;
    }
  ) => api.patch<Envelope<{ community: Community }>>(`/community/${id}`, payload),

  dismissDeleted: (id: string) =>
    api.post<Envelope<{ dismissed: boolean }>>(`/community/${id}/dismiss`),

  weekHistory: (id: string) =>
    api.get<Envelope<{ weeks: CommunityWeekSummary[]; currentWeekStart: string }>>(
      `/community/${id}/weeks`
    ),

  weekView: (
    id: string,
    params?: { weekStart?: string; weekOffset?: number }
  ) =>
    api.get<
      Envelope<{
        isCurrent: boolean;
        week: {
          weekStart: string;
          weekEnd: string;
          weekNumber: number;
          weekYear: number;
          label: string;
        };
        activityConfig: CommunityActivityConfigItem[];
        analytics?: CommunityAnalytics;
        aiSummary?: CommunityAiSummary | null;
        activityAiNotes?: {
          notes: CommunityActivityAiNote[];
          generatedAt?: string;
          source?: string;
          cached?: boolean;
        } | null;
        snapshot: {
          id: string | null;
          memberCount: number;
          membersLogged: number;
          totalValue: number;
          totalPoints: number;
        } | null;
        dashboard: CommunityDashboard;
      }>
    >(`/community/${id}/weeks/view`, { params }),

  uploadAvatar: (id: string, file: Blob, filename = 'avatar.jpg') => {
    const form = new FormData();
    form.append('avatar', file, filename);
    return api.post<Envelope<{ community: Community }>>(`/community/${id}/avatar`, form, {
      timeout: 60_000,
    });
  },

  uploadAboutMedia: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file, index) => {
      form.append('media', file, file.name || `about-${index}`);
    });
    return api.post<
      Envelope<{ community: Community; aboutMedia: CommunityAboutMediaItem[] }>
    >(`/community/${id}/about-media`, form, {
      timeout: 120_000,
    });
  },

  removeAboutMedia: (id: string, url: string) =>
    api.delete<Envelope<{ community: Community; aboutMedia: CommunityAboutMediaItem[] }>>(
      `/community/${id}/about-media`,
      { data: { url } }
    ),

  remindMember: (id: string, profileId: string) =>
    api.post<
      Envelope<{
        reminded: boolean;
        coinsEarned: number;
        alreadyAwarded?: boolean;
        targetProfileId: string;
        weekKey: string;
      }>
    >(`/community/${id}/members/${profileId}/remind`),

  getBuddy: (id: string) =>
    api.get<
      Envelope<{
        week: {
          weekStart: string;
          weekEnd: string;
          weekKey: string;
          label: string;
        };
        buddy: {
          profileId: string;
          userId: string;
          name: string;
          avatarUrl?: string | null;
          avatarSeed?: string | null;
          avatarStyle?: string | null;
        } | null;
        isBye: boolean;
        canNudge: boolean;
        canMessage: boolean;
      }>
    >(`/community/${id}/buddy`),

  assignBuddies: (id: string, mode: 'auto' | 'manual' = 'auto') =>
    api.post<
      Envelope<{
        week: { weekStart: string; weekEnd: string; weekKey: string; label: string };
        pairCount: number;
        memberCount: number;
      }>
    >(`/community/${id}/buddy/assign`, { mode }),

  nudgeBuddy: (id: string) =>
    api.post<
      Envelope<{
        nudged: boolean;
        buddy: {
          profileId: string;
          userId: string;
          name: string;
        } | null;
        weekKey: string;
      }>
    >(`/community/${id}/buddy/nudge`),

  remove: (id: string) =>
    api.delete<Envelope<{ deleted: boolean }>>(`/community/${id}`),

  join: (id: string, payload?: { groupId?: string }) =>
    api.post<Envelope<{ community: Community }>>(`/community/${id}/join`, payload || {}),

  leave: (
    id: string,
    body?: { assignAdminProfileId?: string; acknowledgeDisable?: boolean }
  ) =>
    api.post<
      Envelope<{
        left: boolean;
        deleted: boolean;
        willDisable?: boolean;
        pendingDisableAt?: string | null;
      }>
    >(`/community/${id}/leave`, body || {}),

  members: (
    id: string,
    params?: {
      status?: CommunityMemberStatus;
      sort?: CommunityMemberSort;
      q?: string;
    }
  ) =>
    api.get<Envelope<{ members: CommunityMember[] }>>(`/community/${id}/members`, {
      params,
    }),

  joinRequests: (id: string) =>
    api.get<Envelope<{ requests: CommunityMember[] }>>(`/community/${id}/join-requests`),

  approveJoinRequest: (id: string, profileId: string, payload?: { groupId?: string }) =>
    api.post<Envelope<{ member: CommunityMember }>>(
      `/community/${id}/join-requests/${profileId}/approve`,
      payload || {}
    ),

  rejectJoinRequest: (id: string, profileId: string) =>
    api.post<Envelope<{ rejected: boolean }>>(
      `/community/${id}/join-requests/${profileId}/reject`
    ),

  blacklist: (id: string) =>
    api.get<Envelope<{ members: CommunityMember[] }>>(`/community/${id}/blacklist`),

  blacklistMember: (id: string, profileId: string) =>
    api.post<Envelope<{ member: CommunityMember }>>(
      `/community/${id}/members/${profileId}/blacklist`
    ),

  unblacklistMember: (id: string, profileId: string) =>
    api.post<Envelope<{ member: CommunityMember }>>(
      `/community/${id}/members/${profileId}/unblacklist`
    ),

  updateMemberRole: (id: string, profileId: string, role: CommunityMemberRole) =>
    api.patch<Envelope<{ member: CommunityMember }>>(
      `/community/${id}/members/${profileId}/role`,
      { role }
    ),

  assignMemberGroup: (id: string, profileId: string, groupId: string | null) =>
    api.patch<Envelope<{ member: CommunityMember }>>(
      `/community/${id}/members/${profileId}/group`,
      { groupId }
    ),

  groups: (id: string) =>
    api.get<Envelope<{ groups: CommunityGroup[] }>>(`/community/${id}/groups`),

  createGroup: (id: string, payload: { name: string; description?: string; sortOrder?: number }) =>
    api.post<Envelope<{ group: CommunityGroup }>>(`/community/${id}/groups`, payload),

  updateGroup: (
    id: string,
    groupId: string,
    payload: { name?: string; description?: string; sortOrder?: number }
  ) =>
    api.patch<Envelope<{ group: CommunityGroup }>>(`/community/${id}/groups/${groupId}`, payload),

  deleteGroup: (id: string, groupId: string) =>
    api.delete<Envelope<{ deleted: boolean }>>(`/community/${id}/groups/${groupId}`),

  groupMembers: (id: string, groupId: string) =>
    api.get<Envelope<{ group: CommunityGroup; members: CommunityMember[] }>>(
      `/community/${id}/groups/${groupId}/members`
    ),

  groupWeekView: (id: string, groupId: string, params?: { weekOffset?: number }) =>
    api.get<
      Envelope<{
        group: CommunityGroup;
        isCurrent: boolean;
        week: { label: string; weekStart: string; weekEnd: string };
        analytics?: CommunityAnalytics;
        dashboard: CommunityDashboard;
      }>
    >(`/community/${id}/groups/${groupId}/weeks/view`, { params }),

  announcements: (id: string, params?: { includeDrafts?: boolean }) =>
    api.get<Envelope<{ announcements: CommunityAnnouncement[] }>>(
      `/community/${id}/announcements`,
      { params }
    ),

  createAnnouncement: (
    id: string,
    payload: { title: string; body: string; pinned?: boolean; status?: 'draft' | 'published' }
  ) =>
    api.post<Envelope<{ announcement: CommunityAnnouncement }>>(
      `/community/${id}/announcements`,
      payload
    ),

  updateAnnouncement: (
    id: string,
    announcementId: string,
    payload: {
      title?: string;
      body?: string;
      pinned?: boolean;
      status?: 'draft' | 'published';
    }
  ) =>
    api.patch<Envelope<{ announcement: CommunityAnnouncement }>>(
      `/community/${id}/announcements/${announcementId}`,
      payload
    ),

  deleteAnnouncement: (id: string, announcementId: string) =>
    api.delete<Envelope<{ deleted: boolean }>>(
      `/community/${id}/announcements/${announcementId}`
    ),

  badges: (id: string, params?: { profileId?: string }) =>
    api.get<Envelope<{ badges: CommunityBadge[]; catalog: CommunityBadge[] }>>(
      `/community/${id}/badges`,
      { params }
    ),

  badgeBoard: (id: string) =>
    api.get<
      Envelope<{
        unlocks: Array<CommunityBadge & { profile: { id: string; name: string } }>;
      }>
    >(`/community/${id}/badges/board`),

  evaluateBadges: (id: string) =>
    api.post<Envelope<{ unlocked: CommunityBadge[] }>>(`/community/${id}/badges/evaluate`),

  searchMembers: (
    id: string,
    q: string,
    params?: { page?: number; limit?: number }
  ) =>
    api.get<Envelope<ProfileSearchPage>>(`/community/${id}/members/search`, {
      params: { q, page: params?.page, limit: params?.limit },
    }),

  addMember: (id: string, payload: { profileId?: string; userId?: string }) =>
    api.post<Envelope<{ member: CommunityMember }>>(`/community/${id}/members`, payload),

  acceptInvite: (id: string) =>
    api.post<Envelope<{ community: Community }>>(`/community/${id}/accept-invite`),

  invitedMembers: (id: string) =>
    api.get<Envelope<{ members: CommunityMember[] }>>(`/community/${id}/members/invited`),

  sendInviteBotMessage: (id: string, profileId: string) =>
    api.post<Envelope<{ sent: boolean; channel: string }>>(
      `/community/${id}/members/${profileId}/invite-message`,
      { channel: 'bot' }
    ),

  removeMember: (id: string, profileId: string) =>
    api.delete<Envelope<{ removed: boolean }>>(`/community/${id}/members/${profileId}`),

  dashboard: (
    id: string,
    params?: { period?: string; month?: string; week?: number | string; activity?: string }
  ) =>
    api.get<Envelope<{ dashboard: CommunityDashboard }>>(`/community/${id}/dashboard`, {
      params,
    }),

  restartLeaderboard: (id: string) =>
    api.post<Envelope<{ community: Community }>>(`/community/${id}/leaderboard/restart`),

  messages: (id: string) =>
    api.get<Envelope<{ messages: CommunityMessage[] }>>(`/community/${id}/messages`),

  searchMessages: (
    id: string,
    q: string,
    params?: { page?: number; limit?: number }
  ) =>
    api.get<
      Envelope<{
        results: CommunityMessage[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
        query: string;
      }>
    >(`/community/${id}/messages/search`, {
      params: { q, page: params?.page, limit: params?.limit },
    }),

  pinnedMessages: (id: string) =>
    api.get<Envelope<{ messages: CommunityMessage[] }>>(`/community/${id}/messages/pinned`),

  pinMessage: (id: string, messageId: string) =>
    api.post<Envelope<{ message: CommunityMessage }>>(`/community/${id}/messages/${messageId}/pin`),

  unpinMessage: (id: string, messageId: string) =>
    api.delete<Envelope<{ communityId: string; messageId: string }>>(
      `/community/${id}/messages/${messageId}/pin`
    ),

  reactToMessage: (id: string, messageId: string, emoji: string) =>
    api.post<Envelope<{ message: CommunityMessage }>>(
      `/community/${id}/messages/${messageId}/reactions`,
      { emoji }
    ),

  votePoll: (id: string, messageId: string, optionIds: string[]) =>
    api.post<Envelope<{ message: CommunityMessage }>>(
      `/community/${id}/messages/${messageId}/poll/vote`,
      { optionIds }
    ),

  closePoll: (id: string, messageId: string) =>
    api.post<Envelope<{ message: CommunityMessage }>>(
      `/community/${id}/messages/${messageId}/poll/close`
    ),

  threadReplies: (id: string, messageId: string, params?: { limit?: number }) =>
    api.get<Envelope<{ parent: CommunityMessage; replies: CommunityMessage[] }>>(
      `/community/${id}/messages/${messageId}/replies`,
      { params }
    ),

  sharedMedia: (
    id: string,
    params?: { type?: string; page?: number; limit?: number }
  ) =>
    api.get<
      Envelope<{
        items: CommunitySharedMediaItem[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
        type: string;
      }>
    >(`/community/${id}/messages/media`, { params }),

  sendMessage: (id: string, text: string, extras?: CommunityMessageSendExtras) =>
    api.post<Envelope<{ message: CommunityMessage }>>(`/community/${id}/messages`, {
      text,
      mentionProfileIds: extras?.mentionProfileIds || [],
      mentionRoles: extras?.mentionRoles || [],
      replyTo: extras?.replyTo || undefined,
      messageType: extras?.messageType || 'text',
      poll: extras?.poll,
      shareCard: extras?.shareCard,
    }),

  sendMediaMessage: (
    id: string,
    file: File,
    text = '',
    extras?: CommunityMessageSendExtras
  ) => {
    const form = new FormData();
    form.append('media', file);
    if (text.trim()) form.append('text', text.trim());
    if (extras?.mentionProfileIds?.length) {
      form.append('mentionProfileIds', JSON.stringify(extras.mentionProfileIds));
    }
    if (extras?.mentionRoles?.length) {
      form.append('mentionRoles', JSON.stringify(extras.mentionRoles));
    }
    if (extras?.replyTo) form.append('replyTo', extras.replyTo);
    return api.post<Envelope<{ message: CommunityMessage }>>(
      `/community/${id}/messages`,
      form,
      { timeout: 120_000 }
    );
  },

  createPoll: (
    id: string,
    poll: NonNullable<CommunityMessageSendExtras['poll']>,
    extras?: { replyTo?: string | null }
  ) =>
    api.post<Envelope<{ message: CommunityMessage }>>(`/community/${id}/messages`, {
      messageType: 'poll',
      poll,
      replyTo: extras?.replyTo || undefined,
      text: poll.question,
    }),

  shareActivityCard: (
    id: string,
    card: NonNullable<CommunityMessageSendExtras['shareCard']>,
    extras?: { replyTo?: string | null }
  ) =>
    api.post<Envelope<{ message: CommunityMessage }>>(`/community/${id}/messages`, {
      messageType: 'share_card',
      shareCard: card,
      replyTo: extras?.replyTo || undefined,
      text: card.title,
    }),

  deleteMessages: (id: string, messageIds: string[], scope: 'me' | 'everyone') =>
    api.post<
      Envelope<{
        communityId: string;
        messageIds: string[];
        scope: 'me' | 'everyone';
        userId?: string;
      }>
    >(`/community/${id}/messages/delete`, { messageIds, scope }),

  clearChat: (id: string) =>
    api.post<Envelope<{ communityId: string; profileId: string; clearedAt: string }>>(
      `/community/${id}/messages/clear`
    ),

  events: (
    id: string,
    params?: {
      filter?: 'upcoming' | 'completed' | 'mine' | 'all';
      from?: string;
      to?: string;
      groupId?: string;
    }
  ) =>
    api.get<Envelope<{ events: CommunityEvent[] }>>(`/community/${id}/events`, { params }),

  upcomingEvents: (id: string, limit = 5) =>
    api.get<Envelope<{ events: CommunityEvent[] }>>(`/community/${id}/events/upcoming`, {
      params: { limit },
    }),

  getEvent: (id: string, eventId: string) =>
    api.get<Envelope<{ event: CommunityEvent }>>(`/community/${id}/events/${eventId}`),

  createEvent: (
    id: string,
    payload: {
      title: string;
      description?: string;
      eventType?: string;
      startsAt: string;
      endsAt?: string | null;
      location?: string;
      meetingLink?: string;
      groupId?: string | null;
      status?: string;
    }
  ) => api.post<Envelope<{ event: CommunityEvent }>>(`/community/${id}/events`, payload),

  updateEvent: (
    id: string,
    eventId: string,
    payload: Partial<{
      title: string;
      description: string;
      eventType: string;
      startsAt: string;
      endsAt: string | null;
      location: string;
      meetingLink: string;
      groupId: string | null;
      status: string;
    }>
  ) =>
    api.patch<Envelope<{ event: CommunityEvent }>>(`/community/${id}/events/${eventId}`, payload),

  deleteEvent: (id: string, eventId: string) =>
    api.delete<Envelope<{ deleted: boolean }>>(`/community/${id}/events/${eventId}`),

  rsvpEvent: (id: string, eventId: string, status: CommunityRsvpStatus) =>
    api.post<Envelope<{ event: CommunityEvent }>>(`/community/${id}/events/${eventId}/rsvp`, {
      status,
    }),

  appreciationTypes: (id: string) =>
    api.get<Envelope<{ types: CommunityAppreciationType[] }>>(
      `/community/${id}/appreciations/types`
    ),

  appreciations: (
    id: string,
    params?: {
      direction?: 'received' | 'given';
      profileId?: string;
      limit?: number;
      cursor?: string;
    }
  ) =>
    api.get<
      Envelope<{
        appreciations: CommunityAppreciation[];
        nextCursor: string | null;
        direction?: string;
      }>
    >(`/community/${id}/appreciations`, { params }),

  appreciationStats: (id: string, params?: { profileId?: string }) =>
    api.get<Envelope<{ received: number; given: number }>>(
      `/community/${id}/appreciations/stats`,
      { params }
    ),

  appreciationLeaderboard: (id: string, params?: { period?: 'weekly' | 'overall' }) =>
    api.get<
      Envelope<{
        period: string;
        received: Array<{ rank: number; count: number; profileId: string; name: string }>;
        given: Array<{ rank: number; count: number; profileId: string; name: string }>;
      }>
    >(`/community/${id}/appreciations/leaderboard`, { params }),

  sendAppreciation: (
    id: string,
    payload: {
      toProfileId: string;
      type: string;
      message?: string;
      contextType?: string;
      contextId?: string;
    }
  ) =>
    api.post<Envelope<{ appreciation: CommunityAppreciation }>>(
      `/community/${id}/appreciations`,
      payload
    ),
};
