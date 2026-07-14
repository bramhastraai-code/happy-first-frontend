import { getDistance } from 'geolib';
import type { ActivityType, LiveMetrics, TrackPoint } from '@/lib/tracker/types';

const MOVING_SPEED_THRESHOLD_MS = 0.5;
const MAX_SEGMENT_SPEED_MS = 50;
const MAX_TIME_GAP_MS = 120000;

const MET_VALUES: Record<ActivityType, number> = {
  run: 9.8,
  walk: 3.5,
  cycle: 7.5,
  hike: 6,
  other: 5,
};

const STEPS_PER_KM: Record<ActivityType, number> = {
  run: 1400,
  walk: 1300,
  cycle: 0,
  hike: 1200,
  other: 1200,
};

function toMs(date: string | Date) {
  return new Date(date).getTime();
}

export function computeLiveMetrics(
  points: TrackPoint[],
  activityType: ActivityType,
  startedAt?: string,
  totalPausedSec = 0,
  endAtMs?: number
): LiveMetrics {
  if (!points.length) {
    const durationSec =
      startedAt && endAtMs
        ? Math.max(0, Math.round((endAtMs - toMs(startedAt)) / 1000) - totalPausedSec)
        : 0;
    return {
      distanceM: 0,
      durationSec,
      movingTimeSec: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      paceMinPerKm: 0,
      calories: 0,
      steps: 0,
      elevationGainM: 0,
      pointCount: 0,
    };
  }

  const sorted = [...points].sort((a, b) => toMs(a.recordedAt) - toMs(b.recordedAt));
  const startMs = startedAt ? toMs(startedAt) : toMs(sorted[0].recordedAt);
  const endMs = endAtMs ?? toMs(sorted[sorted.length - 1].recordedAt);
  const durationSec = Math.max(0, Math.round((endMs - startMs) / 1000) - totalPausedSec);

  let distanceM = 0;
  let movingTimeSec = 0;
  let maxSpeedKmh = 0;
  let elevationGainM = 0;
  let validCount = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const dtSec = (toMs(curr.recordedAt) - toMs(prev.recordedAt)) / 1000;
    if (dtSec <= 0 || dtSec > MAX_TIME_GAP_MS / 1000) continue;

    const segM = getDistance(
      { latitude: prev.lat, longitude: prev.lng },
      { latitude: curr.lat, longitude: curr.lng }
    );
    const speedMs = curr.speed != null && curr.speed >= 0 ? curr.speed : segM / dtSec;
    if (speedMs > MAX_SEGMENT_SPEED_MS) continue;

    validCount += 1;
    distanceM += segM;
    const speedKmh = speedMs * 3.6;
    if (speedKmh > maxSpeedKmh) maxSpeedKmh = speedKmh;
    if (speedMs >= MOVING_SPEED_THRESHOLD_MS) movingTimeSec += dtSec;
    if (prev.alt != null && curr.alt != null) {
      const gain = curr.alt - prev.alt;
      if (gain > 0) elevationGainM += gain;
    }
  }

  const distanceKm = distanceM / 1000;
  const avgSpeedKmh = movingTimeSec > 0 ? distanceKm / (movingTimeSec / 3600) : 0;
  const paceMinPerKm = distanceKm > 0 ? movingTimeSec / 60 / distanceKm : 0;
  const met = MET_VALUES[activityType];
  const activeSecForCalories =
    movingTimeSec >= 60 ? movingTimeSec : Math.max(movingTimeSec, durationSec);
  const calories = Math.round(met * 70 * (activeSecForCalories / 3600));
  const steps = Math.round(distanceKm * STEPS_PER_KM[activityType]);

  return {
    distanceM: Math.round(distanceM),
    durationSec,
    movingTimeSec: Math.round(movingTimeSec),
    avgSpeedKmh: Math.round(avgSpeedKmh * 100) / 100,
    maxSpeedKmh: Math.round(maxSpeedKmh * 100) / 100,
    paceMinPerKm: Math.round(paceMinPerKm * 100) / 100,
    calories,
    steps,
    elevationGainM: Math.round(elevationGainM * 10) / 10,
    pointCount: validCount,
  };
}

export function formatDistance(meters: number, unit: 'km' | 'mi' = 'km') {
  const km = meters / 1000;
  if (unit === 'mi') return `${(km * 0.621371).toFixed(2)} mi`;
  return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(meters)} m`;
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatPace(paceMinPerKm: number) {
  if (!paceMinPerKm || !Number.isFinite(paceMinPerKm)) return '—';
  const m = Math.floor(paceMinPerKm);
  const s = Math.round((paceMinPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}
