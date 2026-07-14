'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackPoint } from '@/lib/tracker/types';
import {
  getFixQuality,
  isAccuracyAcceptable,
  isDisplayAccuracyAcceptable,
  shouldRecordRoutePoint,
  smoothPosition,
  type GpsFixQuality,
} from '@/lib/tracker/utils/gpsFilter';

export type LocationPermission = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UseLocationOptions {
  enabled?: boolean;
  onPoint?: (point: TrackPoint) => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 20000,
};

export function useLocation({ enabled = false, onPoint }: UseLocationOptions = {}) {
  const [permission, setPermission] = useState<LocationPermission>('prompt');
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [fixQuality, setFixQuality] = useState<GpsFixQuality>('searching');
  const [liveFix, setLiveFix] = useState<{ lat: number; lng: number } | null>(null);
  const [isStationary, setIsStationary] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const onPointRef = useRef(onPoint);
  const lastRecordedRef = useRef<TrackPoint | null>(null);
  const lastRawPointRef = useRef<TrackPoint | null>(null);
  const smoothedFixRef = useRef<{ lat: number; lng: number } | null>(null);

  onPointRef.current = onPoint;

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermission('unsupported');
      return;
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((result) => {
        setPermission(result.state as LocationPermission);
        result.onchange = () => setPermission(result.state as LocationPermission);
      })
      .catch(() => {});
  }, []);

  const recordAnchorPoint = useCallback(() => {
    const point = lastRawPointRef.current;
    if (!point || !isAccuracyAcceptable(point.accuracy, { anchor: true })) return null;
    if (lastRecordedRef.current) return lastRecordedRef.current;
    lastRecordedRef.current = point;
    setIsStationary(false);
    onPointRef.current?.(point);
    return point;
  }, []);

  const processPosition = useCallback((pos: GeolocationPosition) => {
    setPermission('granted');
    setError(null);

    const point: TrackPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      alt: pos.coords.altitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed != null && pos.coords.speed >= 0 ? pos.coords.speed : null,
      heading: pos.coords.heading,
      recordedAt: new Date(pos.timestamp).toISOString(),
    };

    setAccuracy(point.accuracy ?? null);
    setFixQuality(getFixQuality(point.accuracy));

    if (!isDisplayAccuracyAcceptable(point.accuracy)) {
      return;
    }

    lastRawPointRef.current = point;

    const smoothed = smoothPosition(smoothedFixRef.current, {
      lat: point.lat,
      lng: point.lng,
    });
    smoothedFixRef.current = smoothed;
    setLiveFix(smoothed);

    if (shouldRecordRoutePoint(point, lastRecordedRef.current)) {
      lastRecordedRef.current = point;
      setIsStationary(false);
      onPointRef.current?.(point);
      return;
    }

    setIsStationary(true);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission('unsupported');
      return;
    }
    stopWatching();
    watchIdRef.current = navigator.geolocation.watchPosition(
      processPosition,
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Allow location access in your browser settings.'
            : err.code === err.TIMEOUT
              ? 'GPS signal timed out. Move near a window or open sky and try again.'
              : err.message;
        setError(message);
        if (err.code === err.PERMISSION_DENIED) setPermission('denied');
      },
      GEO_OPTIONS
    );
  }, [processPosition, stopWatching]);

  const requestPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setPermission('unsupported');
      setError('GPS is not supported on this device.');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          processPosition(pos);
          resolve(true);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? 'Location permission is required to track your workout.'
              : err.message;
          setError(message);
          if (err.code === err.PERMISSION_DENIED) setPermission('denied');
          resolve(false);
        },
        GEO_OPTIONS
      );
    });
  }, [processPosition]);

  useEffect(() => {
    if (enabled) {
      lastRecordedRef.current = null;
      smoothedFixRef.current = null;
      setIsStationary(false);
      startWatching();
    } else {
      stopWatching();
    }
    return stopWatching;
  }, [enabled, startWatching, stopWatching]);

  return {
    permission,
    error,
    accuracy,
    fixQuality,
    liveFix,
    isStationary,
    requestPermission,
    recordAnchorPoint,
    startWatching,
    stopWatching,
  };
}
