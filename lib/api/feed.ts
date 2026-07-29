import api from './axios';

export interface FeedAuthor {
  profileId: string;
  userId?: string | null;
  name: string;
  userName?: string | null;
  isFollowing?: boolean;
}

export type FeedMediaType = 'image' | 'video';

export interface FeedMediaItem {
  url: string;
  mediaType?: FeedMediaType;
}

export interface FeedPost {
  id: string;
  imageUrl: string;
  mediaType?: FeedMediaType;
  mediaItems?: FeedMediaItem[];
  isStory?: boolean;
  caption: string;
  createdAt: string;
  communityId?: string | null;
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

export interface StoryViewerPerson {
  profileId: string;
  userId: string;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  viewedAt: string;
}

export interface FeedComment {
  id: string;
  text: string;
  createdAt: string;
  parentCommentId?: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies?: FeedComment[];
  author: {
    profileId: string;
    userId?: string | null;
    name: string;
  };
}

export interface FeedPage {
  posts: FeedPost[];
  nextCursor: string | null;
}

type ApiEnvelope<T> = { data: T; message?: string; success?: boolean };

export const feedAPI = {
  getFeed: (params?: { limit?: number; cursor?: string; communityId?: string }) =>
    api.get<ApiEnvelope<FeedPage>>('/feed', { params }),

  getStories: () =>
    api.get<ApiEnvelope<{ stories: FeedStory[] }>>('/feed/stories'),

  recordStoryView: (storyId: string) =>
    api.post<ApiEnvelope<{ recorded: boolean; viewCount: number }>>(
      `/feed/stories/${storyId}/view`
    ),

  getStoryViews: (storyId: string) =>
    api.get<ApiEnvelope<{ viewCount: number; viewers: StoryViewerPerson[] }>>(
      `/feed/stories/${storyId}/views`
    ),

  createPost: (
    file: File | Blob | Array<File | Blob>,
    options?: { caption?: string; kind?: 'post' | 'story'; communityId?: string }
  ) => {
    const form = new FormData();
    const files = Array.isArray(file) ? file : [file];
    files.forEach((item, index) => {
      const filename =
        item instanceof File && item.name
          ? item.name
          : `feed-${Date.now()}-${index}.${String(item.type || '').includes('video') ? 'mp4' : 'jpg'}`;
      form.append('media', item, filename);
    });
    if (options?.caption?.trim()) form.append('caption', options.caption.trim());
    form.append('kind', options?.kind || 'post');
    if (options?.communityId) form.append('communityId', options.communityId);
    return api.post<ApiEnvelope<{ post: FeedPost }>>('/feed/posts', form, {
      timeout: 180_000,
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

  addComment: (photoId: string, text: string, parentCommentId?: string | null) =>
    api.post<ApiEnvelope<{ comment: FeedComment; commentCount: number }>>(
      `/feed/${photoId}/comments`,
      { text, parentCommentId: parentCommentId || undefined }
    ),

  toggleCommentLike: (commentId: string) =>
    api.post<
      ApiEnvelope<{
        commentId: string;
        photoId: string;
        likedByMe: boolean;
        likeCount: number;
      }>
    >(`/feed/comments/${commentId}/like`),

  updatePost: (photoId: string, caption: string) =>
    api.patch<ApiEnvelope<{ post: FeedPost }>>(`/feed/${photoId}`, { caption }),

  deletePost: (photoId: string) =>
    api.delete<ApiEnvelope<{ deleted: boolean; photoId: string }>>(`/feed/${photoId}`),
};
