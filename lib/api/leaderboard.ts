import api from './axios';

export interface LeaderboardEntry {
  rank: number;
  value: number;
  user: {
    _id: string;
    name: string;
  };
}

export const leaderboardAPI = {
  getWeekly: (activity: string) => {
    const params: { activity?: string; date?:string} = {};
    if (activity != null) params.activity = activity;
    params.date = new Date().toISOString().split('T')[0];

    return api.get<{
      success: boolean;
      message: string;
      data:LeaderboardEntry[];

    }>('/leaderboard/get', { params });
  },
  
  getAllTime: (activity: string) => {
    const params: {  activity?: string ,date?:string,logType?: string} = {};
    if (activity!=null) params.activity = activity;
    params.date = new Date().toISOString().split('T')[0];
    params.logType='daily';

    return api.get<{
      success: boolean;
      message: string;
      data:LeaderboardEntry[];
    }>('/leaderboard/get', {params });
  },
};
