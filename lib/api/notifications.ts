import api from './axios';

export interface AppNotification {
  id: string;
  type:
    | 'like'
    | 'comment'
    | 'message'
    | 'post'
    | 'follow'
    | 'post_collaboration'
    | 'community_announcement'
    | 'community_week_summary'
    | 'community_nudge'
    | 'community_event'
    | 'community_event_reminder'
    | 'community_appreciation'
    | 'community_mention'
    | 'community_reply';
  title: string;
  body: string;
  photoId?: string | null;
  conversationId?: string | null;
  communityId?: string | null;
  announcementId?: string | null;
  eventId?: string | null;
  appreciationId?: string | null;
  messageId?: string | null;
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

  pushPublicKey: () =>
    api.get<Envelope<{ publicKey: string | null; enabled: boolean }>>(
      '/notifications/push/public-key'
    ),

  pushSubscribe: (subscription: PushSubscriptionJSON) =>
    api.post<Envelope<{ id: string }>>('/notifications/push/subscribe', { subscription }),

  pushUnsubscribe: (endpoint: string) =>
    api.post<Envelope<{ removed: number }>>('/notifications/push/unsubscribe', { endpoint }),
};
