import { DateTime } from 'luxon';
import { dailyLogAPI, type DailySummary, type MonthlySummary, type WeeklySummary, type StreakData, type CalendarData, type ActivityCalendarData, type LeaderboardData, type MissedLogDaysData } from '@/lib/api/dailyLog';
import { weeklyPlanAPI, type WeeklyPlan } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import { activityAPI, type Activity } from '@/lib/api/activity';
import { communityAPI } from '@/lib/api/community';
import {
  resolveProfileTimezone,
  toProfileDateKey,
} from '@/lib/utils/profileTime';

export async function fetchCurrentPlan(date: string): Promise<WeeklyPlan | null> {
  const res = await weeklyPlanAPI.getCurrent(date);
  return res.data.data ?? null;
}

export async function fetchUpcomingPlan(): Promise<WeeklyPlan | null> {
  return weeklyPlanAPI.getUpcomingPlan();
}

export async function fetchLogSummary<T = DailySummary | WeeklySummary | MonthlySummary>(
  period: 'daily' | 'weekly' | 'monthly',
  date: string
): Promise<T> {
  const res = await dailyLogAPI.getSummary(period, date);
  return res.data.data as T;
}

export async function fetchDailySummary(date: string): Promise<DailySummary | null> {
  try {
    return await fetchLogSummary<DailySummary>('daily', date);
  } catch {
    return null;
  }
}

export async function fetchStreaks(profileId: string): Promise<StreakData> {
  const res = await dailyLogAPI.getStreaks(profileId);
  return res.data.data;
}

export async function fetchCalendar(
  profileId: string,
  month: number,
  year: number,
  leaderboardPage = 1,
  allTimeLeaderboardPage = 1,
  options?: {
    includeAnalytics?: boolean;
    includeMonthlyLeaderboard?: boolean;
    includeAllTimeLeaderboard?: boolean;
  }
): Promise<CalendarData> {
  const res = await dailyLogAPI.getCalendar(profileId, {
    month,
    year,
    leaderboardPage,
    allTimeLeaderboardPage,
    includeAnalytics: options?.includeAnalytics,
    includeMonthlyLeaderboard: options?.includeMonthlyLeaderboard,
    includeAllTimeLeaderboard: options?.includeAllTimeLeaderboard,
  });
  return res.data.data;
}

export async function fetchActivityCalendar(
  profileId: string,
  activityId: string,
  month: number,
  year: number,
  leaderboardPage = 1,
  allTimeLeaderboardPage = 1,
  options?: {
    includeMonthlyLeaderboard?: boolean;
    includeAllTimeLeaderboard?: boolean;
  }
): Promise<ActivityCalendarData> {
  const res = await dailyLogAPI.getActivityCalendar(profileId, activityId, {
    month,
    year,
    leaderboardPage,
    allTimeLeaderboardPage,
    includeMonthlyLeaderboard: options?.includeMonthlyLeaderboard,
    includeAllTimeLeaderboard: options?.includeAllTimeLeaderboard,
  });
  return res.data.data;
}

export async function fetchAllTimeLeaderboard(
  profileId: string,
  page: number,
  activityId?: string
): Promise<LeaderboardData> {
  const res = await dailyLogAPI.getLeaderboard(profileId, {
    activityId,
    page,
  });
  return res.data.data.leaderboard;
}

export async function fetchUserInfo() {
  const res = await authAPI.userInfo();
  return res.data.data;
}

export async function fetchActivityList(): Promise<Activity[]> {
  const res = await activityAPI.getList();
  return res.data.data ?? [];
}

export async function fetchCommunityActivities(date?: string): Promise<number> {
  try {
    const res = await communityAPI.myActivities(date ? { date } : undefined);
    return res.data.data?.activities?.length ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchMissedLogDays(withinDays = 30): Promise<MissedLogDaysData> {
  const res = await dailyLogAPI.getMissedLogDays(withinDays);
  return (
    res.data.data ?? {
      withinDays,
      count: 0,
      days: [],
    }
  );
}

export interface MonthlyDataPoint {
  date: string;
  points: number;
  day: number;
  activitiesCount: number;
}

export interface WeeklyDataPoint {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  weekStartISO: string;
  totalPoints: number;
  avgActivities: number;
  daysCount: number;
}

export function groupDataByWeeks(
  data: MonthlyDataPoint[],
  timezone?: string | null
): WeeklyDataPoint[] {
  const weeks: Map<string, MonthlyDataPoint[]> = new Map();

  data.forEach((point) => {
    const dateKey = toProfileDateKey(point.date, timezone);
    const weekKey = DateTime.fromISO(dateKey, {
      zone: resolveProfileTimezone(timezone),
    })
      .startOf('week')
      .toFormat('yyyy-MM-dd');
    if (!weeks.has(weekKey)) weeks.set(weekKey, []);
    weeks.get(weekKey)!.push({ ...point, date: dateKey });
  });

  return Array.from(weeks.entries()).map(([weekKey, points]) => {
    const weekStart = DateTime.fromISO(weekKey, {
      zone: resolveProfileTimezone(timezone),
    });
    const weekEnd = weekStart.endOf('week');
    return {
      weekLabel: `Week ${weekStart.toFormat('MMM dd')}`,
      weekStart: weekStart.toFormat('MMM dd'),
      weekEnd: weekEnd.toFormat('MMM dd'),
      weekStartISO: weekKey,
      totalPoints: points.reduce((sum, p) => sum + p.points, 0),
      avgActivities: points.reduce((sum, p) => sum + p.activitiesCount, 0) / points.length,
      daysCount: points.length,
    };
  });
}

export function monthlyBreakdownToPoints(
  breakdown: MonthlySummary['dailyBreakdown'],
  timezone?: string | null
): MonthlyDataPoint[] {
  const zone = resolveProfileTimezone(timezone);
  return breakdown.map((item) => {
    const dateKey = toProfileDateKey(item.date, zone);
    return {
      date: dateKey,
      points: item.points,
      day: DateTime.fromISO(dateKey, { zone }).day,
      activitiesCount: item.activityCount,
    };
  });
}
