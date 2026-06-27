import api from './axios';

export interface ActivityPhoto {
  _id: string;
  user: { _id: string; name: string } | string;
  profile: { _id: string; name: string } | string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

export const activityPhotosAPI = {
  getAll: (limit = 50) =>
    api.get<{ data: ActivityPhoto[] }>('/activityPhotos', { params: { limit } }),

  getMine: (limit = 50) =>
    api.get<{ data: ActivityPhoto[] }>('/activityPhotos/mine', { params: { limit } }),
};
