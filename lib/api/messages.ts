import api from './axios';
import type {
  CommunityPoll,
  CommunityShareCard,
  CommunityShareCardKind,
} from '@/lib/api/community';

export interface FeedConversation {
  id: string;
  lastMessageAt: string;
  lastMessageText: string;
  other: {
    userId: string;
    profileId?: string | null;
    name: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  };
}

export type FeedChatMessageType = 'text' | 'poll' | 'share_card';

export interface FeedChatMessage {
  id: string;
  conversationId: string;
  text: string;
  messageType?: FeedChatMessageType;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  deletedForEveryone?: boolean;
  createdAt: string;
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

export interface FeedSharedMediaItem {
  messageId: string;
  type: string;
  url: string;
  text?: string;
  createdAt: string;
  senderName: string;
}

type Envelope<T> = { data: T };

export const messagesAPI = {
  listConversations: () =>
    api.get<Envelope<{ conversations: FeedConversation[] }>>('/messages/conversations'),

  openConversation: (userId: string, profileId?: string) =>
    api.post<Envelope<{ conversation: FeedConversation }>>('/messages/conversations', {
      userId,
      profileId,
    }),

  listMessages: (conversationId: string) =>
    api.get<Envelope<{ messages: FeedChatMessage[] }>>(
      `/messages/conversations/${conversationId}/messages`
    ),

  searchMessages: (conversationId: string, q: string, params?: { page?: number; limit?: number }) =>
    api.get<
      Envelope<{ messages: FeedChatMessage[]; page: number; hasMore: boolean }>
    >(`/messages/conversations/${conversationId}/messages/search`, {
      params: { q, ...params },
    }),

  sharedMedia: (
    conversationId: string,
    params?: { type?: string; page?: number; limit?: number }
  ) =>
    api.get<
      Envelope<{ items: FeedSharedMediaItem[]; page: number; hasMore: boolean }>
    >(`/messages/conversations/${conversationId}/messages/media`, { params }),

  sendMessage: (conversationId: string, text: string) =>
    api.post<Envelope<{ message: FeedChatMessage }>>(
      `/messages/conversations/${conversationId}/messages`,
      { text }
    ),

  sendMediaMessage: (conversationId: string, file: File, text = '') => {
    const form = new FormData();
    form.append('media', file);
    if (text.trim()) form.append('text', text.trim());
    return api.post<Envelope<{ message: FeedChatMessage }>>(
      `/messages/conversations/${conversationId}/messages`,
      form,
      { timeout: 120_000 }
    );
  },

  createPoll: (
    conversationId: string,
    poll: {
      question: string;
      options: string[];
      allowMultiple?: boolean;
      anonymous?: boolean;
      closesAt?: string;
    }
  ) =>
    api.post<Envelope<{ message: FeedChatMessage }>>(
      `/messages/conversations/${conversationId}/messages`,
      {
        messageType: 'poll',
        poll,
        text: poll.question,
      }
    ),

  votePoll: (conversationId: string, messageId: string, optionIds: string[]) =>
    api.post<Envelope<{ message: FeedChatMessage }>>(
      `/messages/conversations/${conversationId}/messages/${messageId}/poll/vote`,
      { optionIds }
    ),

  closePoll: (conversationId: string, messageId: string) =>
    api.post<Envelope<{ message: FeedChatMessage }>>(
      `/messages/conversations/${conversationId}/messages/${messageId}/poll/close`
    ),

  shareAchievement: (
    conversationId: string,
    shareCard: {
      kind: CommunityShareCardKind;
      title: string;
      subtitle?: string;
      meta?: Record<string, unknown>;
      href?: string | null;
    }
  ) =>
    api.post<Envelope<{ message: FeedChatMessage }>>(
      `/messages/conversations/${conversationId}/messages`,
      {
        messageType: 'share_card',
        shareCard,
        text: shareCard.title,
      }
    ),

  deleteMessages: (
    conversationId: string,
    messageIds: string[],
    scope: 'me' | 'everyone'
  ) =>
    api.post<
      Envelope<{
        conversationId: string;
        messageIds: string[];
        scope: 'me' | 'everyone';
        userId?: string;
      }>
    >(`/messages/conversations/${conversationId}/messages/delete`, {
      messageIds,
      scope,
    }),

  clearChat: (conversationId: string) =>
    api.post<Envelope<{ conversationId: string; userId: string; clearedAt: string }>>(
      `/messages/conversations/${conversationId}/clear`
    ),

  deleteChat: (conversationId: string) =>
    api.delete<Envelope<{ conversationId: string; userId: string }>>(
      `/messages/conversations/${conversationId}`
    ),
};
