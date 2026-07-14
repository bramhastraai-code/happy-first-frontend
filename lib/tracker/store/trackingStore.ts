import { create } from 'zustand';
import type { ActivityType, LiveMetrics, SessionStatus, TrackPoint } from '@/lib/tracker/types';
import { computeLiveMetrics } from '@/lib/tracker/utils/metrics';

interface TrackingState {
  sessionId: string | null;
  activityType: ActivityType;
  status: SessionStatus | 'idle';
  startedAt: string | null;
  totalPausedSec: number;
  points: TrackPoint[];
  batchIndex: number;
  watchId: number | null;
  shareCode: string | null;
  isOffline: boolean;
  isSyncing: boolean;
  liveMetrics: LiveMetrics;
  setSession: (data: {
    sessionId: string;
    activityType: ActivityType;
    startedAt: string;
    shareCode?: string | null;
  }) => void;
  restoreSession: (data: {
    sessionId: string;
    activityType: ActivityType;
    startedAt: string;
    shareCode?: string | null;
    status: SessionStatus | 'idle';
    totalPausedSec?: number;
    points?: TrackPoint[];
    batchIndex?: number;
  }) => void;
  setStatus: (status: SessionStatus | 'idle') => void;
  addPoint: (point: TrackPoint) => void;
  setPoints: (points: TrackPoint[]) => void;
  incrementBatch: () => number;
  setWatchId: (id: number | null) => void;
  addPausedSec: (sec: number) => void;
  setOffline: (offline: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  reset: () => void;
}

const initialMetrics = computeLiveMetrics([], 'run');

export const useTrackingStore = create<TrackingState>((set, get) => ({
  sessionId: null,
  activityType: 'run',
  status: 'idle',
  startedAt: null,
  totalPausedSec: 0,
  points: [],
  batchIndex: 0,
  watchId: null,
  shareCode: null,
  isOffline: false,
  isSyncing: false,
  liveMetrics: initialMetrics,

  setSession: ({ sessionId, activityType, startedAt, shareCode }) =>
    set({
      sessionId,
      activityType,
      startedAt,
      shareCode: shareCode ?? null,
      status: 'active',
      points: [],
      batchIndex: 0,
      totalPausedSec: 0,
      liveMetrics: computeLiveMetrics([], activityType, startedAt),
    }),

  restoreSession: ({
    sessionId,
    activityType,
    startedAt,
    shareCode,
    status,
    totalPausedSec = 0,
    points = [],
    batchIndex = 0,
  }) =>
    set({
      sessionId,
      activityType,
      startedAt,
      shareCode: shareCode ?? null,
      status,
      points,
      batchIndex,
      totalPausedSec,
      liveMetrics: computeLiveMetrics(points, activityType, startedAt, totalPausedSec),
    }),

  setStatus: (status) => set({ status }),

  addPoint: (point) => {
    const state = get();
    const points = [...state.points, point];
    set({
      points,
      liveMetrics: computeLiveMetrics(
        points,
        state.activityType,
        state.startedAt ?? undefined,
        state.totalPausedSec
      ),
    });
  },

  setPoints: (points) => {
    const state = get();
    set({
      points,
      liveMetrics: computeLiveMetrics(
        points,
        state.activityType,
        state.startedAt ?? undefined,
        state.totalPausedSec
      ),
    });
  },

  incrementBatch: () => {
    const next = get().batchIndex + 1;
    set({ batchIndex: next });
    return next - 1;
  },

  setWatchId: (watchId) => set({ watchId }),
  addPausedSec: (sec) => set((s) => ({ totalPausedSec: s.totalPausedSec + sec })),
  setOffline: (isOffline) =>
    set((s) => (s.isOffline === isOffline ? s : { isOffline })),
  setSyncing: (isSyncing) =>
    set((s) => (s.isSyncing === isSyncing ? s : { isSyncing })),
  reset: () =>
    set({
      sessionId: null,
      activityType: 'run',
      status: 'idle',
      startedAt: null,
      totalPausedSec: 0,
      points: [],
      batchIndex: 0,
      watchId: null,
      shareCode: null,
      isSyncing: false,
      liveMetrics: initialMetrics,
    }),
}));
