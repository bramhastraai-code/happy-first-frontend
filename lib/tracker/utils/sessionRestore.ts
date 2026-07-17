import axios from 'axios';
import { fitnessTrackerAPI } from '@/lib/tracker/api/fitnessTracker';
import type { TrackPoint, WorkoutSession } from '@/lib/tracker/types';

function normalizePoint(point: TrackPoint): TrackPoint {
  return {
    ...point,
    recordedAt:
      typeof point.recordedAt === 'string'
        ? point.recordedAt
        : new Date(point.recordedAt).toISOString(),
  };
}

export async function loadAllSessionPoints(sessionId: string) {
  const limit = 50;
  let page = 1;
  const batches: Array<{ batchIndex: number; points: TrackPoint[] }> = [];

  for (;;) {
    const res = await fitnessTrackerAPI.getSessionPoints(sessionId, page, limit);
    const { items, total } = res.data.data;
    batches.push(...items);
    if (!items.length || batches.length >= total) break;
    page += 1;
  }

  batches.sort((a, b) => a.batchIndex - b.batchIndex);
  const points = batches.flatMap((batch) => batch.points.map(normalizePoint));
  const maxBatchIndex = batches.reduce((max, batch) => Math.max(max, batch.batchIndex), -1);

  return {
    points,
    nextBatchIndex: maxBatchIndex + 1,
  };
}

export function isActiveSessionConflict(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 409;
}

export async function fetchActiveSession() {
  const res = await fitnessTrackerAPI.getActiveSession();
  return res.data.data;
}

export async function hydrateActiveSession(session: WorkoutSession) {
  const { points, nextBatchIndex } = await loadAllSessionPoints(session._id);
  return {
    sessionId: session._id,
    activityType: session.activityType,
    startedAt: session.startedAt,
    shareCode: session.shareCode,
    status: session.status === 'paused' ? ('paused' as const) : ('active' as const),
    totalPausedSec: session.totalPausedSec ?? 0,
    pausedAt:
      session.status === 'paused' && session.pausedAt
        ? new Date(session.pausedAt).getTime()
        : null,
    points,
    batchIndex: nextBatchIndex,
  };
}
