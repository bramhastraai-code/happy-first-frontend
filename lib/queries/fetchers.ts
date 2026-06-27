import { DateTime } from 'luxon';
import { dailyLogAPI, type DailySummary, type MonthlySummary, type WeeklySummary, type StreakData, type CalendarData, type ActivityCalendarData } from '@/lib/api/dailyLog';
import { weeklyPlanAPI, type WeeklyPlan } from '@/lib/api/weeklyPlan';
import { authAPI } from '@/lib/api/auth';
import { activityAPI, type Activity } from '@/lib/api/activity';

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
  year: number
): Promise<CalendarData> {
  const res = await dailyLogAPI.getCalendar(profileId, month, year);
  return res.data.data;
}

export async function fetchActivityCalendar(
  profileId: string,
  activityId: string,
  month: number,
  year: number
): Promise<ActivityCalendarData> {
  const res = await dailyLogAPI.getActivityCalendar(profileId, activityId, month, year);
  return res.data.data;
}

export async function fetchUserInfo() {
  const res = await authAPI.userInfo();
  return res.data.data;
}

export async function fetchActivityList(): Promise<Activity[]> {
  const res = await activityAPI.getList();
  return res.data.data ?? [];
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

export function groupDataByWeeks(data: MonthlyDataPoint[]): WeeklyDataPoint[] {
  const weeks: Map<string, MonthlyDataPoint[]> = new Map();

  data.forEach((point) => {
    const weekKey = DateTime.fromISO(point.date).startOf('week').toFormat('yyyy-MM-dd');
    if (!weeks.has(weekKey)) weeks.set(weekKey, []);
    weeks.get(weekKey)!.push(point);
  });

  return Array.from(weeks.entries()).map(([weekKey, points]) => {
    const weekStart = DateTime.fromISO(weekKey);
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

export function monthlyBreakdownToPoints(breakdown: MonthlySummary['dailyBreakdown']): MonthlyDataPoint[] {
  return breakdown.map((item) => ({
    date: item.date,
    points: item.points,
    day: DateTime.fromISO(item.date).day,
    activitiesCount: item.activityCount,
  }));
}
