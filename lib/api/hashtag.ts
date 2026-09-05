import api from './axios';
import type { FeedPost } from './feed';

export interface HashtagSummary {
  id: string;
  name: string;
  normalizedName: string;
  postCount: number;
}

export interface HashtagFeedPage {
  hashtag: HashtagSummary;
  posts: FeedPost[];
  nextCursor: string | null;
}

type ApiEnvelope<T> = { data: T; message?: string; success?: boolean };

export const hashtagAPI = {
  getTrending: (limit = 30) =>
    api.get<ApiEnvelope<{ hashtags: HashtagSummary[] }>>('/feed/hashtags/trending', {
      params: { limit },
    }),

  search: (q: string, limit = 20) =>
    api.get<ApiEnvelope<{ hashtags: HashtagSummary[] }>>('/feed/hashtags/search', {
      params: { q, limit },
    }),

  getFeed: (tag: string, params?: { limit?: number; cursor?: string }) =>
    api.get<ApiEnvelope<HashtagFeedPage>>(
      `/feed/hashtags/${encodeURIComponent(tag)}/posts`,
      { params }
    ),
};
