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
};
