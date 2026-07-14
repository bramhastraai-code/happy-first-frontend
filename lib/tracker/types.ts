export type ActivityType = 'run' | 'walk' | 'cycle' | 'hike' | 'other';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface TrackPoint {
  lat: number;
  lng: number;
  alt?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  recordedAt: string;
}

export interface WorkoutMetrics {
  distanceM: number;
  durationSec: number;
  movingTimeSec: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  paceMinPerKm: number;
  calories: number;
  steps: number;
  elevationGainM: number;
}

export interface WorkoutSession {
  _id: string;
  profile: string;
  user: string;
  activityType: ActivityType;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string | null;
  pausedAt?: string | null;
  totalPausedSec?: number;
  metrics?: WorkoutMetrics;
  routePreview?: string;
  pointCount?: number;
  shareCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionsListResponse {
  items: WorkoutSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PeriodStats {
  period: string;
  start: string;
  end: string;
  totals: {
    sessions: number;
    distanceKm: number;
    durationMin: number;
    movingMin: number;
    calories: number;
    steps: number;
    elevationM: number;
    maxSpeedKmh: number;
    avgPaceMinPerKm: number;
  };
  byActivityType: Record<string, PeriodStats['totals']>;
}

export interface DashboardStats {
  weekly: PeriodStats;
  monthly: PeriodStats;
  recent: WorkoutSession[];
}

export interface FitnessGoal {
  _id: string;
  type: 'distance' | 'duration' | 'calories' | 'sessions';
  target: number;
  period: 'weekly' | 'monthly';
  activityType?: ActivityType | null;
  active: boolean;
  current?: number;
  percent?: number;
}

export interface FitnessAchievement {
  _id: string;
  code: string;
  unlockedAt: string;
  meta?: { label?: string; sessionId?: string };
}

export interface LiveMetrics extends WorkoutMetrics {
  pointCount: number;
}
