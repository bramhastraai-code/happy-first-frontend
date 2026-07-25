import api from './axios';

export interface FeedConversation {
  id: string;
  lastMessageAt: string;
  lastMessageText: string;
  other: {
    userId: string;
    profileId?: string | null;
    name: string;
  };
}

export interface FeedChatMessage {
  id: string;
  conversationId: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  deletedForEveryone?: boolean;
  createdAt: string;
  sender: {
    userId: string;
    profileId: string;
    name: string;
  };
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
