import api from './axios';

export interface Activity {
  _id: string;
  name: string;
  baseUnit: string;
  description: string;
  tier: number;
  category: string;
  icon: string;
  allowedCadence: ('daily' | 'weekly')[];
  values:[
    {
      tier:number;
      maxVal:number;
      minVal:number;
    }
  ]
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

  getlistTiers: () => {
    return api.get<{ success: boolean; message: string; data: {activities:Activity[],tier:number} }>(
      '/activity/list/tiers'
    );
  }
};

