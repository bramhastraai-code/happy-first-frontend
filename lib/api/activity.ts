import api from './axios';

export interface Activity {
  _id: string;
  name: string;
  baseUnit: string;
  description: string;
  tier: number;
  allowedCadence: ('daily' | 'weekly')[];
}

export const activityAPI = {
  getList: (tier?: number,isDefault?: boolean) => {
    const params: { tier?: number; isDefault?: boolean } = {};
    if (tier !== undefined) {
      params.tier = tier;
    }
    if (isDefault !== undefined) {
      params.isDefault = isDefault;
    }

    return api.get<{ success: boolean; message: string; data: Activity[] }>(
      '/activity/list',
      { params }
    );
  },
};

