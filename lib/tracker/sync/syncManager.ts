import { fitnessTrackerAPI } from '@/lib/tracker/api/fitnessTracker';
import { trackerDb, type PendingPointBatch } from '@/lib/tracker/db/trackerDb';
import type { TrackPoint } from '@/lib/tracker/types';

export async function queuePointBatch(
  localSessionId: string,
  serverSessionId: string | undefined,
  batchIndex: number,
  points: TrackPoint[]
) {
  if (!trackerDb) return;
  await trackerDb.pendingPointBatches.add({
    localSessionId,
    serverSessionId,
    batchIndex,
    points,
  });
  await trackerDb.syncQueue.add({
    type: 'points',
    localSessionId,
    serverSessionId,
    payload: { batchIndex, points },
    createdAt: new Date().toISOString(),
  });
}

export async function processSyncQueue(onProgress?: (msg: string) => void) {
  if (!trackerDb || !navigator.onLine) return;

  const queue = await trackerDb.syncQueue.orderBy('createdAt').toArray();
  for (const item of queue) {
    try {
      if (item.type === 'points' && item.serverSessionId) {
        const payload = item.payload as { batchIndex: number; points: TrackPoint[] };
        await fitnessTrackerAPI.appendPoints(
          item.serverSessionId,
          payload.batchIndex,
          payload.points
        );
      }
      if (item.id != null) await trackerDb.syncQueue.delete(item.id);
    } catch {
      onProgress?.('Sync paused — will retry');
      break;
    }
  }

  const batches = await trackerDb.pendingPointBatches.toArray();
  for (const batch of batches as PendingPointBatch[]) {
    if (!batch.serverSessionId) continue;
    try {
      await fitnessTrackerAPI.appendPoints(
        batch.serverSessionId,
        batch.batchIndex,
        batch.points
      );
      await trackerDb.pendingPointBatches
        .where({ localSessionId: batch.localSessionId, batchIndex: batch.batchIndex })
        .delete();
    } catch {
      break;
    }
  }
}

export function registerOnlineSync(onProgress?: (msg: string) => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => void processSyncQueue(onProgress);
  window.addEventListener('online', handler);
  void processSyncQueue(onProgress);
  return () => window.removeEventListener('online', handler);
}
