import Dexie, { type Table } from 'dexie';
import type { ActivityType, TrackPoint } from '@/lib/tracker/types';

export interface PendingSession {
  localId: string;
  activityType: ActivityType;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  totalPausedSec: number;
  serverSessionId?: string;
}

export interface PendingPointBatch {
  id?: number;
  localSessionId: string;
  serverSessionId?: string;
  batchIndex: number;
  points: TrackPoint[];
}

export interface SyncQueueItem {
  id?: number;
  type: 'start' | 'points' | 'finish' | 'pause' | 'resume' | 'cancel';
  localSessionId: string;
  serverSessionId?: string;
  payload?: unknown;
  createdAt: string;
}

class TrackerDatabase extends Dexie {
  pendingSessions!: Table<PendingSession, string>;
  pendingPointBatches!: Table<PendingPointBatch, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('happyFirstTracker');
    this.version(1).stores({
      pendingSessions: 'localId, serverSessionId, status',
      pendingPointBatches: '++id, localSessionId, serverSessionId, batchIndex',
      syncQueue: '++id, localSessionId, type, createdAt',
    });
  }
}

export const trackerDb = typeof window !== 'undefined' ? new TrackerDatabase() : null;

export function generateLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
