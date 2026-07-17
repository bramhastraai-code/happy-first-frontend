import { fitnessTrackerAPI } from '@/lib/tracker/api/fitnessTracker';
import { trackerDb, type PendingPointBatch, type PendingSession } from '@/lib/tracker/db/trackerDb';
import type { ActivityType, TrackPoint } from '@/lib/tracker/types';

function isServerSessionId(id: string | undefined | null): id is string {
  return Boolean(id && !id.startsWith('local_'));
}

export async function queuePointBatch(
  localSessionId: string,
  serverSessionId: string | undefined,
  batchIndex: number,
  points: TrackPoint[]
) {
  if (!trackerDb || !points.length) return;

  const resolvedServerId = isServerSessionId(serverSessionId) ? serverSessionId : undefined;

  await trackerDb.pendingPointBatches.add({
    localSessionId,
    serverSessionId: resolvedServerId,
    batchIndex,
    points,
  });
  await trackerDb.syncQueue.add({
    type: 'points',
    localSessionId,
    serverSessionId: resolvedServerId,
    payload: { batchIndex, points },
    createdAt: new Date().toISOString(),
  });
}

async function bindBatchesToServer(localSessionId: string, serverSessionId: string) {
  if (!trackerDb) return;
  await trackerDb.pendingPointBatches
    .where('localSessionId')
    .equals(localSessionId)
    .modify({ serverSessionId });
  await trackerDb.syncQueue
    .where('localSessionId')
    .equals(localSessionId)
    .modify({ serverSessionId });
}

async function uploadPendingBatchesForSession(localSessionId: string, serverSessionId: string) {
  if (!trackerDb) return;

  const batches = (await trackerDb.pendingPointBatches
    .where('localSessionId')
    .equals(localSessionId)
    .sortBy('batchIndex')) as PendingPointBatch[];

  for (const batch of batches) {
    try {
      await fitnessTrackerAPI.appendPoints(serverSessionId, batch.batchIndex, batch.points);
      if (batch.id != null) {
        await trackerDb.pendingPointBatches.delete(batch.id);
      } else {
        await trackerDb.pendingPointBatches
          .where({ localSessionId, batchIndex: batch.batchIndex })
          .delete();
      }
    } catch {
      throw new Error('Failed to upload GPS batch');
    }
  }

  // Clear matching sync-queue point items once batches are uploaded.
  const queue = await trackerDb.syncQueue.where('localSessionId').equals(localSessionId).toArray();
  for (const item of queue) {
    if (item.type === 'points' && item.id != null) {
      await trackerDb.syncQueue.delete(item.id);
    }
  }
}

/**
 * Create the server session for a locally-tracked workout (started offline),
 * upload every queued GPS batch, and optionally finish it.
 * Returns the server session id, or null if sync could not complete.
 */
export async function syncLocalSession(
  localSessionId: string,
  options?: {
    finish?: boolean;
    activityType?: ActivityType;
    startedAt?: string;
    endedAt?: string;
    totalPausedSec?: number;
    /** Extra in-memory points not yet queued (e.g. final flush). */
    extraPoints?: TrackPoint[];
    nextBatchIndex?: number;
  }
): Promise<string | null> {
  if (!trackerDb || !navigator.onLine) return null;

  const pending = (await trackerDb.pendingSessions.get(localSessionId)) as
    | PendingSession
    | undefined;

  const activityType = options?.activityType ?? pending?.activityType;
  const startedAt = options?.startedAt ?? pending?.startedAt;
  if (!activityType || !startedAt) return null;

  let serverSessionId = pending?.serverSessionId;
  if (!isServerSessionId(serverSessionId)) {
    const res = await fitnessTrackerAPI.startSession(activityType, startedAt);
    serverSessionId = res.data.data._id;
    await trackerDb.pendingSessions.update(localSessionId, { serverSessionId });
  }

  await bindBatchesToServer(localSessionId, serverSessionId);

  if (options?.extraPoints?.length) {
    let batchIndex = options.nextBatchIndex;
    if (batchIndex == null) {
      const existing = await trackerDb.pendingPointBatches
        .where('localSessionId')
        .equals(localSessionId)
        .toArray();
      batchIndex = existing.length
        ? Math.max(...existing.map((b) => b.batchIndex)) + 1
        : 0;
    }
    await queuePointBatch(localSessionId, serverSessionId, batchIndex, options.extraPoints);
  }

  await uploadPendingBatchesForSession(localSessionId, serverSessionId);

  if (options?.finish) {
    const totalPausedSec = options.totalPausedSec ?? pending?.totalPausedSec ?? 0;
    const endedAt = options.endedAt ?? new Date().toISOString();
    await fitnessTrackerAPI.finishSession(serverSessionId, {
      totalPausedSec,
      endedAt,
    });
    await trackerDb.pendingSessions.delete(localSessionId);
  }

  return serverSessionId;
}

/** Flush any queued point batches that already know their server session id. */
export async function flushQueuedPointBatches(onProgress?: (msg: string) => void) {
  if (!trackerDb || !navigator.onLine) return;

  const queue = await trackerDb.syncQueue.orderBy('createdAt').toArray();
  for (const item of queue) {
    if (item.type !== 'points' || !isServerSessionId(item.serverSessionId)) continue;
    try {
      const payload = item.payload as { batchIndex: number; points: TrackPoint[] };
      await fitnessTrackerAPI.appendPoints(
        item.serverSessionId,
        payload.batchIndex,
        payload.points
      );
      if (item.id != null) await trackerDb.syncQueue.delete(item.id);
      await trackerDb.pendingPointBatches
        .where({
          localSessionId: item.localSessionId,
          batchIndex: payload.batchIndex,
        })
        .delete();
    } catch {
      onProgress?.('Sync paused — will retry');
      break;
    }
  }
}

/** Sync any completed offline sessions that are still sitting in IndexedDB. */
export async function syncCompletedOfflineSessions(onProgress?: (msg: string) => void) {
  if (!trackerDb || !navigator.onLine) return;

  const completed = (await trackerDb.pendingSessions
    .where('status')
    .equals('completed')
    .toArray()) as PendingSession[];

  for (const session of completed) {
    try {
      onProgress?.('Uploading offline workout…');
      await syncLocalSession(session.localId, {
        finish: true,
        activityType: session.activityType,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        totalPausedSec: session.totalPausedSec,
      });
    } catch {
      onProgress?.('Sync paused — will retry');
      break;
    }
  }
}

export async function processSyncQueue(onProgress?: (msg: string) => void) {
  if (!trackerDb || !navigator.onLine) return;
  await flushQueuedPointBatches(onProgress);
  await syncCompletedOfflineSessions(onProgress);
}

export function registerOnlineSync(onProgress?: (msg: string) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => void processSyncQueue(onProgress);
  window.addEventListener('online', handler);
  void processSyncQueue(onProgress);
  return () => window.removeEventListener('online', handler);
}
