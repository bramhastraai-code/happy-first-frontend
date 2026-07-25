import api from './axios';

export interface AppNotification {
  id: string;
  type: 'like' | 'comment' | 'message' | 'post';
  title: string;
  body: string;
  photoId?: string | null;
  conversationId?: string | null;
  readAt?: string | null;
  createdAt: string;
  actor: {
    userId?: string | null;
    profileId?: string | null;
    name: string;
  };
}

type Envelope<T> = { data: T };

export const notificationsAPI = {
  list: () =>
    api.get<Envelope<{ notifications: AppNotification[]; unread: number }>>('/notifications'),

  unreadCount: () => api.get<Envelope<{ unread: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    api.post<Envelope<{ notification: AppNotification | null }>>(`/notifications/${id}/read`),

  markAllRead: () => api.post<Envelope<{ unread: number }>>('/notifications/read-all'),
};
