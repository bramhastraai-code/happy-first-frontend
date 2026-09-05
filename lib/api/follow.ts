import api from './axios';
import type { FeedPost } from './feed';
import type { DailyMoodView } from '@/lib/utils/dailyMood';

export interface FollowPerson {
  profileId: string;
  userId?: string | null;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  bio?: string | null;
  website?: string | null;
  publicHighlight?: string | null;
  createdAt?: string | null;
  memberSince?: string | null;
  daysWithHappyFirst?: number | null;
  level?: string | null;
  city?: string | null;
  sameLevel?: boolean;
  sameActivity?: boolean;
  sameLocation?: boolean;
  matchLabel?: string | null;
  allowMessages?: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
}

export interface PublicProfileCommunity {
  id: string;
  name: string;
  type: 'public' | 'private' | 'invite_only' | string;
  isPublic: boolean;
  memberCount: number;
  role: 'admin' | 'moderator' | 'member' | string;
  viewerIsMember: boolean;
  viewerCanJoin: boolean;
  viewerMembershipStatus?:
    | 'active'
    | 'pending'
    | 'invited'
    | 'blacklisted'
    | 'removed'
    | 'left'
    | string
    | null;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  icon?: string | null;
}

export interface PublicProfileData {
  profile: FollowPerson;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  sparkCount?: number;
  repostsCount?: number;
  communityPostsCount?: number;
  lastPostAt?: string | null;
  daysSinceLastPost?: number | null;
  thisWeekActivitiesTotal?: number;
  thisWeekCompletionPercent?: number;
  totalActivitiesTotal?: number;
  xpTotal?: number;
  coinsBalance?: number;
  allowMessages?: boolean;
  communities?: PublicProfileCommunity[];
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
  dailyMood?: DailyMoodView;
}

export interface FollowActionResult {
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  sparkCount?: number;
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
}

type Envelope<T> = { data: T; message?: string; success?: boolean };

export const followAPI = {
  getPublicProfile: (profileId: string) =>
    api.get<Envelope<PublicProfileData>>(`/follow/${profileId}/public`),

  getFollowers: (profileId: string, params?: { limit?: number; cursor?: string }) =>
    api.get<Envelope<{ people: FollowPerson[]; nextCursor: string | null }>>(
      `/follow/${profileId}/followers`,
      { params }
    ),

  getFollowing: (profileId: string, params?: { limit?: number; cursor?: string }) =>
    api.get<Envelope<{ people: FollowPerson[]; nextCursor: string | null }>>(
      `/follow/${profileId}/following`,
      { params }
    ),

  getPosts: (
    profileId: string,
    params?: {
      limit?: number;
      cursor?: string;
      tab?: 'posts' | 'spark' | 'reposts' | 'community' | 'all';
    }
  ) =>
    api.get<Envelope<{ posts: FeedPost[]; nextCursor: string | null }>>(
      `/follow/${profileId}/posts`,
      { params }
    ),

  getSuggestions: (limit = 12) =>
    api.get<Envelope<{ people: FollowPerson[] }>>('/follow/suggestions', {
      params: { limit },
    }),

  searchUsers: (q: string, limit = 24) =>
    api.get<Envelope<{ people: FollowPerson[]; query: string }>>('/follow/search', {
      params: { q, limit },
    }),

  searchMentionCandidates: (q: string, limit = 16) =>
    api.get<Envelope<{ people: FollowPerson[]; query: string }>>('/follow/mention-search', {
      params: { q, limit },
    }),

  follow: (profileId: string) =>
    api.post<Envelope<FollowActionResult>>(`/follow/${profileId}`),

  unfollow: (profileId: string) =>
    api.delete<Envelope<FollowActionResult>>(`/follow/${profileId}`),
};
