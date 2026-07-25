import api from './axios';

export interface CommunityActivity {
  id: string;
  name: string;
  category: string | null;
  icon: string | null;
  baseUnit: string | null;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  activities: CommunityActivity[];
  categories: string[];
  memberCount: number;
  isPublic: boolean;
  leaderboardMode: 'weekly' | 'monthly';
  overallResetAt: string;
  createdAt: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  icon?: string | null;
  createdBy: {
    userId: string;
    profileId: string;
    name: string;
  };
  myRole: 'admin' | 'member' | null;
  isMember: boolean;
}

export interface CommunityMember {
  id: string;
  role: 'admin' | 'member';
  joinedAt: string;
  userId: string;
  profile: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  };
}

export interface CommunityMessage {
  id: string;
  communityId: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  deletedForEveryone?: boolean;
  createdAt: string;
  sender: {
    userId: string;
    profileId: string;
    name: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  };
}

export interface CommunityLeaderboardRow {
  profileId: string;
  name: string;
  role: 'admin' | 'member';
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  points: number;
  rank: number;
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
  }>;
  myOverall: CommunityLeaderboardRow | null;
  memberCount: number;
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

export const communityAPI = {
  list: (params?: { q?: string; category?: string }) =>
    api.get<Envelope<{ communities: Community[] }>>('/community', { params }),

  mine: () => api.get<Envelope<{ communities: Community[] }>>('/community/mine'),

  get: (id: string) =>
    api.get<Envelope<{ community: Community }>>(`/community/${id}`),

  create: (payload: {
    name: string;
    description?: string;
    activityIds: string[];
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
      leaderboardMode?: 'weekly' | 'monthly';
      avatarUrl?: string | null;
      avatarSeed?: string | null;
      avatarStyle?: string | null;
      icon?: string | null;
    }
  ) => api.patch<Envelope<{ community: Community }>>(`/community/${id}`, payload),

  uploadAvatar: (id: string, file: Blob, filename = 'avatar.jpg') => {
    const form = new FormData();
    form.append('avatar', file, filename);
    return api.post<Envelope<{ community: Community }>>(`/community/${id}/avatar`, form, {
      timeout: 60_000,
    });
  },

  remove: (id: string) =>
    api.delete<Envelope<{ deleted: boolean }>>(`/community/${id}`),

  join: (id: string) =>
    api.post<Envelope<{ community: Community }>>(`/community/${id}/join`),

  leave: (id: string) =>
    api.post<Envelope<{ left: boolean; deleted: boolean }>>(`/community/${id}/leave`),

  members: (id: string) =>
    api.get<Envelope<{ members: CommunityMember[] }>>(`/community/${id}/members`),

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

  sendMessage: (id: string, text: string) =>
    api.post<Envelope<{ message: CommunityMessage }>>(`/community/${id}/messages`, { text }),

  sendMediaMessage: (id: string, file: File, text = '') => {
    const form = new FormData();
    form.append('media', file);
    if (text.trim()) form.append('text', text.trim());
    return api.post<Envelope<{ message: CommunityMessage }>>(
      `/community/${id}/messages`,
      form,
      { timeout: 120_000 }
    );
  },

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
};
