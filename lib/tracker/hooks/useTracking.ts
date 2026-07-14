'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { fitnessTrackerAPI } from '@/lib/tracker/api/fitnessTracker';
import { useTrackingStore } from '@/lib/tracker/store/trackingStore';
import { queuePointBatch, registerOnlineSync } from '@/lib/tracker/sync/syncManager';
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

  const flushBatch = useCallback(async () => {
    const { sessionId, incrementBatch } = useTrackingStore.getState();
    const batch = pendingBatchRef.current;
    if (!sessionId || batch.length === 0) return;

    const batchIndex = incrementBatch();
    const points = [...batch];
    pendingBatchRef.current = [];

    if (!navigator.onLine) {
      await queuePointBatch(localSessionIdRef.current || sessionId, sessionId, batchIndex, points);
      return;
    }

    try {
      await fitnessTrackerAPI.appendPoints(sessionId, batchIndex, points);
    } catch {
      await queuePointBatch(localSessionIdRef.current || sessionId, sessionId, batchIndex, points);
    }
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
    storeState.status === 'active' ? now : undefined
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
    const { sessionId, setStatus } = useTrackingStore.getState();
    if (!sessionId) return;
    stopWatching();
    await flushBatch();
    if (navigator.onLine && !sessionId.startsWith('local_')) {
      await fitnessTrackerAPI.pauseSession(sessionId);
    }
    setStatus('paused');
  }, [stopWatching, flushBatch]);

  const resume = useCallback(async () => {
    const { sessionId, setStatus } = useTrackingStore.getState();
    if (!sessionId) return;
    if (navigator.onLine && !sessionId.startsWith('local_')) {
      await fitnessTrackerAPI.resumeSession(sessionId);
    }
    setStatus('active');
    startWatching();
  }, [startWatching]);

  const cancel = useCallback(async () => {
    const { sessionId, reset } = useTrackingStore.getState();
    if (!sessionId) return;
    stopWatching();
    if (navigator.onLine && !sessionId.startsWith('local_')) {
      await fitnessTrackerAPI.cancelSession(sessionId);
    }
    reset();
    router.push('/tracker');
  }, [stopWatching, router]);

  const invalidateDashboard = useCallback(async () => {
    await invalidateAllTrackerQueries(queryClient);
  }, [queryClient]);

  const stop = useCallback(async () => {
    const { sessionId, reset } = useTrackingStore.getState();
    if (!sessionId) return;
    stopWatching();
    await flushFinalAnchor();
    let finishedId = sessionId;
    if (navigator.onLine && !sessionId.startsWith('local_')) {
      const res = await fitnessTrackerAPI.finishSession(sessionId);
      finishedId = res.data.data._id;
    }
    reset();
    await invalidateDashboard();
    router.push(`/tracker/session/${finishedId}`);
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
