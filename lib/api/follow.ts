import api from './axios';
import type { FeedPost } from './feed';

export interface FollowPerson {
  profileId: string;
  userId?: string | null;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  level?: string | null;
  city?: string | null;
  sameLevel?: boolean;
  sameActivity?: boolean;
  sameLocation?: boolean;
  matchLabel?: string | null;
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
}

export interface PublicProfileData {
  profile: FollowPerson;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
}

export interface FollowActionResult {
  followersCount: number;
  followingCount: number;
  postsCount?: number;
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

  getPosts: (profileId: string, params?: { limit?: number; cursor?: string }) =>
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

  follow: (profileId: string) =>
    api.post<Envelope<FollowActionResult>>(`/follow/${profileId}`),

  unfollow: (profileId: string) =>
    api.delete<Envelope<FollowActionResult>>(`/follow/${profileId}`),
};
