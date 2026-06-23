import api from './axios';

export interface ActivityPhoto {
  _id: string;
  user: string;
  profile: { _id: string; name: string } | string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

export const activityPhotosAPI = {
  getAll: (limit = 50) => api.get<{ data: ActivityPhoto[] }>('/activityPhotos', { params: { limit } }),
  getMine: (profileId: string) =>
    api.get<{ data: ActivityPhoto[] }>('/activityPhotos/mine', { params: { profile: profileId } }),
};
