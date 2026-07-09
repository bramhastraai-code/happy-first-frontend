import api from "./axios";
import type { LeaderboardData } from "./dailyLog";

export type { LeaderboardData, LeaderboardEntry, LeaderboardPagination } from "./dailyLog";

export const leaderboardAPI = {
  getWeekly: (activity: string, date?: string, page = 1, limit = 15) => {
    const params: { activity?: string; date?: string; page: number; limit: number } = {
      page,
      limit,
    };
    if (activity != null) params.activity = activity;
    params.date = date || new Date().toISOString().split("T")[0];

    return api.get<{
      success: boolean;
      message: string;
      data: LeaderboardData;
    }>("/leaderboard/get", { params });
  },
};
