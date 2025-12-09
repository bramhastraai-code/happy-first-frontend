import api from './axios';

export interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  weeklyPoints?: number;
  totalPoints?: number;
  activitiesCompleted?: number;
  streak?: number;
  weeksActive?: number;
  longestStreak?: number;
  totalReferrals?: number;
  activeReferrals?: number;
  referralPoints?: number;
}

export const leaderboardAPI = {
  getWeekly: (limit?: number) => {
    const params = limit ? { limit } : {};
    return api.get<{
      success: boolean;
      message: string;
      data: LeaderboardUser[];
    }>('/leaderboard/weekly', { params });
  },
  
  getAllTime: (limit?: number) => {
    const params = limit ? { limit } : {};
    return api.get<{
      success: boolean;
      message: string;
      data: LeaderboardUser[];
    }>('/leaderboard/all-time', { params });
  },
  
  getReferral: (limit?: number) => {
    const params = limit ? { limit } : {};
    return api.get<{
      success: boolean;
      message: string;
      data: LeaderboardUser[];
    }>('/leaderboard/referral', { params });
  },
};
