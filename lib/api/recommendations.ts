import api from './axios';

export interface RecommendedActivity {
  activityId: string;
  name: string;
  reason: string;
  suggestedCadence: 'daily' | 'weekly';
  suggestedTarget: number;
  baseUnit: string;
}

export const recommendationsAPI = {
  get: () => api.get<{
    success: boolean;
    message: string;
    data: {
      recommendedActivities: RecommendedActivity[];
    };
  }>('/recommendations'),
};
