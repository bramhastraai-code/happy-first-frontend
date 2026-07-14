import { getDistance } from 'geolib';
import type { TrackPoint } from '@/lib/tracker/types';

/** Minimum movement before adding a new route point (reduces zig-zag when still). */
const MIN_DISTANCE_M = 10;
/** Reject fixes worse than this for route recording. */
const MAX_RECORD_ACCURACY_M = 65;
/** Still show live map pin up to this accuracy. */
const MAX_DISPLAY_ACCURACY_M = 100;
/** Minimum gap between recorded points. */
const MIN_INTERVAL_MS = 2500;
/** Max realistic speed between two points (m/s) — ~43 km/h on foot. */
const MAX_IMPLIED_SPEED_MS = 12;

export type GpsFixQuality = 'searching' | 'weak' | 'fair' | 'good';

export function getFixQuality(accuracy: number | null | undefined): GpsFixQuality {
  if (accuracy == null || !Number.isFinite(accuracy)) return 'searching';
  if (accuracy <= 15) return 'good';
  if (accuracy <= 35) return 'fair';
  if (accuracy <= MAX_RECORD_ACCURACY_M) return 'weak';
  return 'searching';
}

export function isAccuracyAcceptable(
  accuracy: number | null | undefined,
  options?: { anchor?: boolean }
) {
  if (accuracy == null || !Number.isFinite(accuracy)) return false;
  const max = options?.anchor ? 80 : MAX_RECORD_ACCURACY_M;
  return accuracy <= max;
}

export function isDisplayAccuracyAcceptable(accuracy: number | null | undefined) {
  return accuracy != null && Number.isFinite(accuracy) && accuracy <= MAX_DISPLAY_ACCURACY_M;
}

export function shouldRecordRoutePoint(
  point: TrackPoint,
  lastRecorded: TrackPoint | null
): boolean {
  if (!isAccuracyAcceptable(point.accuracy)) return false;
  if (!lastRecorded) return true;

  const elapsedMs =
    new Date(point.recordedAt).getTime() - new Date(lastRecorded.recordedAt).getTime();
  if (elapsedMs < MIN_INTERVAL_MS) return false;

  const distanceM = getDistance(
    { latitude: lastRecorded.lat, longitude: lastRecorded.lng },
    { latitude: point.lat, longitude: point.lng }
  );

  const accuracy = point.accuracy ?? MIN_DISTANCE_M;
  const movementThreshold = Math.max(MIN_DISTANCE_M, Math.min(accuracy * 0.6, 25));

  if (distanceM < movementThreshold) return false;

  const impliedSpeed = distanceM / (elapsedMs / 1000);
  if (impliedSpeed > MAX_IMPLIED_SPEED_MS) return false;

  const deviceSpeed = point.speed;
  if (deviceSpeed != null && deviceSpeed >= 0 && deviceSpeed < 0.4 && distanceM < accuracy) {
    return false;
  }

  return true;
}

export function smoothPosition(
  previous: { lat: number; lng: number } | null,
  next: { lat: number; lng: number },
  alpha = 0.35
) {
  if (!previous) return next;
  return {
    lat: previous.lat * (1 - alpha) + next.lat * alpha,
    lng: previous.lng * (1 - alpha) + next.lng * alpha,
  };
}
