import api from './axios';

export interface FeedAuthor {
  profileId: string;
  userId?: string | null;
  name: string;
  userName?: string | null;
}

export type FeedMediaType = 'image' | 'video';

export interface FeedPost {
  id: string;
  imageUrl: string;
  mediaType?: FeedMediaType;
  isStory?: boolean;
  caption: string;
  createdAt: string;
  author: FeedAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface FeedStoryItem {
  id: string;
  imageUrl: string;
  mediaType?: FeedMediaType;
  caption?: string;
  createdAt: string;
}

export interface FeedStory {
  profileId: string;
  userId?: string;
  name: string;
  imageUrl: string;
  mediaType?: FeedMediaType;
  latestPhotoId: string;
  items?: FeedStoryItem[];
  createdAt: string;
}

export interface FeedComment {
  id: string;
  text: string;
  createdAt: string;
  author: {
    profileId: string;
    name: string;
  };
}

export interface FeedPage {
  posts: FeedPost[];
  nextCursor: string | null;
}

type ApiEnvelope<T> = { data: T; message?: string; success?: boolean };

export const feedAPI = {
  getFeed: (params?: { limit?: number; cursor?: string }) =>
    api.get<ApiEnvelope<FeedPage>>('/feed', { params }),

  getStories: () =>
    api.get<ApiEnvelope<{ stories: FeedStory[] }>>('/feed/stories'),

  createPost: (file: File | Blob, options?: { caption?: string; kind?: 'post' | 'story' }) => {
    const form = new FormData();
    const filename =
      file instanceof File && file.name
        ? file.name
        : `feed-${Date.now()}.${String(file.type || '').includes('video') ? 'mp4' : 'jpg'}`;
    form.append('media', file, filename);
    if (options?.caption?.trim()) form.append('caption', options.caption.trim());
    form.append('kind', options?.kind || 'post');
    return api.post<ApiEnvelope<{ post: FeedPost }>>('/feed/posts', form, {
      timeout: 120_000,
    });
  },

  toggleLike: (photoId: string) =>
    api.post<ApiEnvelope<{ likedByMe: boolean; likeCount: number }>>(
      `/feed/${photoId}/like`
    ),

  getComments: (photoId: string, limit = 40) =>
    api.get<ApiEnvelope<{ comments: FeedComment[] }>>(`/feed/${photoId}/comments`, {
      params: { limit },
    }),

  addComment: (photoId: string, text: string) =>
    api.post<ApiEnvelope<{ comment: FeedComment; commentCount: number }>>(
      `/feed/${photoId}/comments`,
      { text }
    ),
};
