import api from './axios';

export interface FeedAuthor {
  profileId: string;
  userId?: string | null;
  name: string;
  userName?: string | null;
  isFollowing?: boolean;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
}

export type FeedMediaType = 'image' | 'video';

export interface FeedMediaItem {
  url: string;
  mediaType?: FeedMediaType;
}

export interface FeedRepostRef {
  id: string;
  author: FeedAuthor;
  createdAt?: string;
}

export interface FeedCollaborator {
  profileId: string;
  userId?: string | null;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  isMe?: boolean;
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
  communityName?: string | null;
  /** Global mirror of a community post — UI shows “posted in {name}”. */
  postedFromCommunity?: boolean;
  collaborators?: FeedCollaborator[];
  acceptedCollaborators?: FeedCollaborator[];
  textCard?: {
    text: string;
    backgroundId: string;
    fontId: string;
    kind: 'post' | 'story';
  } | null;
  author: FeedAuthor;
  repostOf?: FeedRepostRef | null;
  repostCount?: number;
  repostedByMe?: boolean;
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
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
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
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  };
}

export interface FeedPage {
  posts: FeedPost[];
  nextCursor: string | null;
}

export interface FeedSearchPage extends FeedPage {
  query?: string;
}

export interface FeedLikePerson {
  profileId: string;
  userId?: string | null;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  isFollowing: boolean;
  followsYou: boolean;
  isMe: boolean;
  likedAt?: string;
}

export type PublishTarget = 'post' | 'story' | 'both';

export interface CreatePostResult {
  post: FeedPost;
  feedPost?: FeedPost | null;
  story?: FeedPost | null;
}

type ApiEnvelope<T> = { data: T; message?: string; success?: boolean };

export function formatCollaborationLabel(
  authorName: string,
  accepted: Array<{ name: string }> | undefined | null
) {
  const list = accepted || [];
  if (!list.length) return authorName;
  if (list.length === 1) return `${authorName} with ${list[0].name}`;
  return `${authorName} with ${list[0].name} and ${list.length - 1} others`;
}

export const feedAPI = {
  getFeed: (params?: { limit?: number; cursor?: string; communityId?: string }) =>
    api.get<ApiEnvelope<FeedPage>>('/feed', { params }),

  getExploreFeed: (params?: { limit?: number; cursor?: string }) =>
    api.get<ApiEnvelope<FeedPage>>('/feed/explore', { params }),

  searchFeed: (params: {
    q: string;
    limit?: number;
    cursor?: string;
    communityId?: string;
  }) => api.get<ApiEnvelope<FeedSearchPage>>('/feed/search', { params }),

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

  getLikes: (photoId: string, limit = 100) =>
    api.get<ApiEnvelope<{ people: FeedLikePerson[] }>>(`/feed/${photoId}/likes`, {
      params: { limit },
    }),

  toggleRepost: (photoId: string) =>
    api.post<ApiEnvelope<{ reposted: boolean; repostCount: number; photoId: string }>>(
      `/feed/${photoId}/repost`
    ),

  createPost: (
    file: File | Blob | Array<File | Blob>,
    options?: {
      caption?: string;
      kind?: PublishTarget;
      publishTo?: PublishTarget;
      communityId?: string;
      collaboratorProfileIds?: string[];
      alsoPublishToGlobal?: boolean;
      isSurpriseProof?: boolean;
      linkedActivity?: string;
      textCard?: {
        text: string;
        backgroundId: string;
        fontId: string;
        kind: 'post' | 'story';
      };
    }
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
    const target = options?.publishTo || options?.kind || 'post';
    form.append('kind', target === 'both' ? 'both' : target);
    form.append('publishTo', target);
    if (options?.communityId) form.append('communityId', options.communityId);
    if (options?.collaboratorProfileIds?.length) {
      form.append('collaboratorProfileIds', JSON.stringify(options.collaboratorProfileIds));
    }
    if (typeof options?.alsoPublishToGlobal === 'boolean') {
      form.append('alsoPublishToGlobal', options.alsoPublishToGlobal ? 'true' : 'false');
    }
    if (options?.isSurpriseProof) {
      form.append('isSurpriseProof', 'true');
    }
    if (options?.linkedActivity) {
      form.append('linkedActivity', options.linkedActivity);
    }
    if (options?.textCard?.text) {
      form.append('textCard', JSON.stringify(options.textCard));
    }
    return api.post<ApiEnvelope<CreatePostResult>>('/feed/posts', form, {
      timeout: 180_000,
    });
  },

  respondToCollaboration: (photoId: string, action: 'accept' | 'decline') =>
    api.post<ApiEnvelope<{ post: FeedPost }>>(`/feed/${photoId}/collaboration`, {
      action,
    }),

  removeCollaborator: (photoId: string, profileId: string) =>
    api.post<ApiEnvelope<{ post: FeedPost }>>(
      `/feed/${photoId}/collaboration/remove`,
      { profileId }
    ),

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

  deleteComment: (commentId: string) =>
    api.delete<
      ApiEnvelope<{
        commentId: string;
        deletedIds: string[];
        photoId: string;
        commentCount: number;
        communityId?: string | null;
      }>
    >(`/feed/comments/${commentId}`),

  updatePost: (
    photoId: string,
    caption: string,
    options?: {
      textCard?: {
        text: string;
        backgroundId: string;
        fontId: string;
        kind: 'post' | 'story';
      };
      media?: Blob | File;
    }
  ) => {
    if (options?.media || options?.textCard) {
      const form = new FormData();
      form.append('caption', caption ?? '');
      if (options.textCard) {
        form.append('textCard', JSON.stringify(options.textCard));
      }
      if (options.media) {
        const filename =
          options.media instanceof File && options.media.name
            ? options.media.name
            : 'text-card.jpg';
        form.append('media', options.media, filename);
      }
      return api.patch<ApiEnvelope<{ post: FeedPost }>>(`/feed/${photoId}`, form, {
        timeout: 180_000,
      });
    }
    return api.patch<ApiEnvelope<{ post: FeedPost }>>(`/feed/${photoId}`, { caption });
  },

  deletePost: (photoId: string) =>
    api.delete<ApiEnvelope<{ deleted: boolean; photoId: string }>>(`/feed/${photoId}`),
};
