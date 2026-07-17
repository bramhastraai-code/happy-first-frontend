'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { fitnessTrackerAPI } from '@/lib/tracker/api/fitnessTracker';
import { useTrackingStore } from '@/lib/tracker/store/trackingStore';
import {
  flushQueuedPointBatches,
  processSyncQueue,
  queuePointBatch,
  registerOnlineSync,
  syncLocalSession,
} from '@/lib/tracker/sync/syncManager';
import { generateLocalId, trackerDb } from '@/lib/tracker/db/trackerDb';
import {
  fetchActiveSession,
  hydrateActiveSession,
  isActiveSessionConflict,
} from '@/lib/tracker/utils/sessionRestore';
import type { ActivityType, TrackPoint } from '@/lib/tracker/types';
import { getDistance } from 'geolib';
import { computeLiveMetrics } from '@/lib/tracker/utils/metrics';
import { useLocation } from './useLocation';
import { invalidateAllTrackerQueries } from './trackerQueries';

const BATCH_SIZE = 20;
const BATCH_INTERVAL_MS = 5000;

export function useTracking() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRestoring, setIsRestoring] = useState(true);
  const restoreAttemptedRef = useRef(false);

  const storeState = useTrackingStore(
    useShallow((s) => ({
      sessionId: s.sessionId,
      activityType: s.activityType,
      status: s.status,
      startedAt: s.startedAt,
      totalPausedSec: s.totalPausedSec,
      pausedAt: s.pausedAt,
      points: s.points,
      batchIndex: s.batchIndex,
      watchId: s.watchId,
      shareCode: s.shareCode,
      isOffline: s.isOffline,
      isSyncing: s.isSyncing,
      liveMetrics: s.liveMetrics,
    }))
  );

  const pendingBatchRef = useRef<TrackPoint[]>([]);
  const lastFlushRef = useRef<number>(Date.now());
  const localSessionIdRef = useRef<string | null>(null);
  /** Serializes uploads so Finish never races ahead of an in-flight GPS batch. */
  const flushChainRef = useRef<Promise<void>>(Promise.resolve());

  const flushBatch = useCallback(async () => {
    const run = async () => {
      const { sessionId, incrementBatch } = useTrackingStore.getState();
      const batch = pendingBatchRef.current;
      if (!sessionId || batch.length === 0) return;

      const batchIndex = incrementBatch();
      const points = [...batch];
      pendingBatchRef.current = [];

      const localId = localSessionIdRef.current || sessionId;
      const isLocal = sessionId.startsWith('local_');
      const serverId = isLocal ? undefined : sessionId;

      // Offline / local sessions always queue — never POST a local_ id to the API.
      if (!navigator.onLine || isLocal) {
        await queuePointBatch(localId, serverId, batchIndex, points);
        return;
      }

      try {
        await fitnessTrackerAPI.appendPoints(sessionId, batchIndex, points);
      } catch {
        await queuePointBatch(localId, sessionId, batchIndex, points);
      }
    };

    const next = flushChainRef.current.then(run, run);
    flushChainRef.current = next.then(
      () => undefined,
      () => undefined
    );
    await next;
  }, []);

  const handlePoint = useCallback(
    (point: TrackPoint) => {
      const { status, addPoint } = useTrackingStore.getState();
      if (status !== 'active') return;
      addPoint(point);
      pendingBatchRef.current.push(point);
      const now = Date.now();
      if (
        pendingBatchRef.current.length >= BATCH_SIZE ||
        now - lastFlushRef.current >= BATCH_INTERVAL_MS
      ) {
        lastFlushRef.current = now;
        void flushBatch();
      }
    },
    [flushBatch]
  );

  const { permission, error: locationError, accuracy, fixQuality, liveFix, isStationary, requestPermission, recordAnchorPoint, startWatching, stopWatching } = useLocation({
    enabled: storeState.status === 'active',
    activityType: storeState.activityType,
    onPoint: handlePoint,
  });

  const flushFinalAnchor = useCallback(async () => {
    const { sessionId, addPoint, points } = useTrackingStore.getState();
    if (!sessionId) return;

    recordAnchorPoint();

    if (liveFix) {
      const finalPoint: TrackPoint = {
        lat: liveFix.lat,
        lng: liveFix.lng,
        accuracy,
        speed: null,
        heading: null,
        recordedAt: new Date().toISOString(),
      };

      const last = points[points.length - 1];
      const shouldAppend =
        !last ||
        getDistance(
          { latitude: last.lat, longitude: last.lng },
          { latitude: finalPoint.lat, longitude: finalPoint.lng }
        ) >= 5;

      if (shouldAppend) {
        addPoint(finalPoint);
        pendingBatchRef.current.push(finalPoint);
      }
    }

    if (pendingBatchRef.current.length) {
      await flushBatch();
    }
  }, [accuracy, flushBatch, liveFix, recordAnchorPoint]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (storeState.status !== 'active') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [storeState.status]);

  const liveMetrics = computeLiveMetrics(
    storeState.points,
    storeState.activityType,
    storeState.startedAt ?? undefined,
    storeState.totalPausedSec,
    storeState.status === 'active'
      ? now
      : storeState.status === 'paused'
        ? (storeState.pausedAt ?? undefined)
        : undefined
  );

  const restoreActiveSession = useCallback(
    async (startGps = false) => {
      const { status, restoreSession } = useTrackingStore.getState();
      if (status !== 'idle') return false;

      const active = await fetchActiveSession();
      if (!active) return false;

      const hydrated = await hydrateActiveSession(active);
      restoreSession(hydrated);
      if (startGps && hydrated.status === 'active') {
        startWatching();
      }
      return true;
    },
    [startWatching]
  );

  useEffect(() => {
    const { setOffline } = useTrackingStore.getState();
    setOffline(!navigator.onLine);

    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    const unregisterSync = registerOnlineSync();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      unregisterSync();
    };
  }, []);

  useEffect(() => {
    if (restoreAttemptedRef.current) return;
    restoreAttemptedRef.current = true;

    const run = async () => {
      try {
        const { status } = useTrackingStore.getState();
        if (status === 'idle' && navigator.onLine) {
          await restoreActiveSession(true);
        }
      } finally {
        setIsRestoring(false);
      }
    };

    void run();
  }, [restoreActiveSession]);

  const start = useCallback(
    async (activityType: ActivityType) => {
      const { setSession } = useTrackingStore.getState();
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      localSessionIdRef.current = generateLocalId();
      if (!navigator.onLine && trackerDb) {
        await trackerDb.pendingSessions.add({
          localId: localSessionIdRef.current,
          activityType,
          startedAt: new Date().toISOString(),
          status: 'active',
          totalPausedSec: 0,
        });
        setSession({
          sessionId: localSessionIdRef.current,
          activityType,
          startedAt: new Date().toISOString(),
        });
        startWatching();
        window.setTimeout(() => recordAnchorPoint(), 1500);
        return;
      }

      try {
        const res = await fitnessTrackerAPI.startSession(activityType);
        const session = res.data.data;
        setSession({
          sessionId: session._id,
          activityType: session.activityType,
          startedAt: session.startedAt,
          shareCode: session.shareCode,
        });
        startWatching();
        window.setTimeout(() => recordAnchorPoint(), 1500);
      } catch (error) {
        if (!isActiveSessionConflict(error)) throw error;
        const restored = await restoreActiveSession(true);
        if (!restored) throw error;
      }
    },
    [startWatching, restoreActiveSession, requestPermission, recordAnchorPoint]
  );

  const pause = useCallback(async () => {
    const { sessionId, setStatus, setPausedAt } = useTrackingStore.getState();
    if (!sessionId) return;
    stopWatching();
    await flushBatch();
    // Track the pause locally first so paused time is never lost,
    // even if the server call fails or we're offline.
    setPausedAt(Date.now());
    setStatus('paused');
    if (navigator.onLine && !sessionId.startsWith('local_')) {
      try {
        await fitnessTrackerAPI.pauseSession(sessionId);
      } catch {
        // Server missed the pause; local pausedAt covers it and
        // totalPausedSec is reconciled on resume/finish.
      }
    }
    if (sessionId.startsWith('local_') && trackerDb) {
      await trackerDb.pendingSessions.update(sessionId, { status: 'paused' });
    }
  }, [stopWatching, flushBatch]);

  const resume = useCallback(async () => {
    const {
      sessionId,
      pausedAt,
      setStatus,
      setPausedAt,
      addPausedSec,
      setTotalPausedSec,
    } = useTrackingStore.getState();
    if (!sessionId) return;

    const localPauseSec = pausedAt
      ? Math.max(0, Math.round((Date.now() - pausedAt) / 1000))
      : 0;
    addPausedSec(localPauseSec);

    if (navigator.onLine && !sessionId.startsWith('local_')) {
      try {
        const res = await fitnessTrackerAPI.resumeSession(sessionId);
        const serverTotal = res.data.data.totalPausedSec;
        if (typeof serverTotal === 'number') {
          setTotalPausedSec(
            Math.max(serverTotal, useTrackingStore.getState().totalPausedSec)
          );
        }
      } catch {
        // e.g. the pause never reached the server — keep local accounting;
        // the correct total is sent to the server on finish.
      }
    }

    if (sessionId.startsWith('local_') && trackerDb) {
      await trackerDb.pendingSessions.update(sessionId, {
        status: 'active',
        totalPausedSec: useTrackingStore.getState().totalPausedSec,
      });
    }

    setPausedAt(null);
    setStatus('active');
    startWatching();
  }, [startWatching]);

  const cancel = useCallback(async () => {
    const { sessionId, reset } = useTrackingStore.getState();
    if (!sessionId) return;
    stopWatching();
    const localId = localSessionIdRef.current || sessionId;
    if (navigator.onLine && !sessionId.startsWith('local_')) {
      try {
        await fitnessTrackerAPI.cancelSession(sessionId);
      } catch {
        // Local cleanup still proceeds below.
      }
    }
    if (trackerDb) {
      await trackerDb.pendingSessions.delete(localId);
      await trackerDb.pendingPointBatches.where('localSessionId').equals(localId).delete();
      await trackerDb.syncQueue.where('localSessionId').equals(localId).delete();
    }
    pendingBatchRef.current = [];
    reset();
    router.push('/tracker');
  }, [stopWatching, router]);

  const invalidateDashboard = useCallback(async () => {
    await invalidateAllTrackerQueries(queryClient);
  }, [queryClient]);

  const stop = useCallback(async () => {
    const state = useTrackingStore.getState();
    const { sessionId, reset, activityType, startedAt } = state;
    if (!sessionId) return;
    stopWatching();
    await flushFinalAnchor();

    // If finishing while paused, fold the in-progress pause into the total.
    const { pausedAt, addPausedSec, setPausedAt } = useTrackingStore.getState();
    if (pausedAt) {
      addPausedSec(Math.max(0, Math.round((Date.now() - pausedAt) / 1000)));
      setPausedAt(null);
    }
    const { totalPausedSec, batchIndex } = useTrackingStore.getState();
    const endedAt = new Date().toISOString();
    const isLocal = sessionId.startsWith('local_');
    const localId = localSessionIdRef.current || (isLocal ? sessionId : null);

    let finishedId = sessionId;

    try {
      if (isLocal && localId) {
        // Persist completion locally first so a failed upload can retry later.
        if (trackerDb) {
          await trackerDb.pendingSessions.update(localId, {
            status: 'completed',
            endedAt,
            totalPausedSec,
            activityType,
            startedAt: startedAt ?? endedAt,
          });
        }

        if (navigator.onLine) {
          const serverId = await syncLocalSession(localId, {
            finish: true,
            activityType,
            startedAt: startedAt ?? endedAt,
            endedAt,
            totalPausedSec,
            // Anything still sitting in the in-memory buffer (shouldn't after flush,
            // but keep as a safety net) uses the next batch index.
            extraPoints: pendingBatchRef.current.length
              ? [...pendingBatchRef.current]
              : undefined,
            nextBatchIndex: batchIndex,
          });
          pendingBatchRef.current = [];
          if (serverId) finishedId = serverId;
        }
      } else if (navigator.onLine) {
        // Upload any batches that failed earlier / were queued while offline
        // BEFORE finishing, so metrics + map are computed from the full track.
        await flushQueuedPointBatches();
        const res = await fitnessTrackerAPI.finishSession(sessionId, {
          totalPausedSec,
          endedAt,
        });
        finishedId = res.data.data._id;
      } else if (trackerDb && localId) {
        // Went offline mid-session: stash as a completed local session for later sync.
        await trackerDb.pendingSessions.put({
          localId,
          activityType,
          startedAt: startedAt ?? endedAt,
          endedAt,
          status: 'completed',
          totalPausedSec,
          serverSessionId: isLocal ? undefined : sessionId,
        });
      }
    } catch {
      // Keep the local completed record so processSyncQueue can retry.
      if (trackerDb && localId) {
        await trackerDb.pendingSessions.put({
          localId,
          activityType,
          startedAt: startedAt ?? endedAt,
          endedAt,
          status: 'completed',
          totalPausedSec,
          serverSessionId: isLocal ? undefined : sessionId,
        });
      }
    }

    reset();
    await invalidateDashboard();
    // Only navigate to the server detail page when we have a real id.
    if (finishedId.startsWith('local_')) {
      router.push('/tracker/history');
    } else {
      router.push(`/tracker/session/${finishedId}`);
    }
    // Kick a background sync in case anything is still queued.
    void processSyncQueue();
  }, [stopWatching, flushFinalAnchor, router, invalidateDashboard]);

  return {
    ...storeState,
    liveMetrics,
    permission,
    locationError,
    accuracy,
    fixQuality,
    liveFix,
    isStationary,
    requestPermission,
    isRestoring,
    start,
    pause,
    resume,
    stop,
    cancel,
  };
}
