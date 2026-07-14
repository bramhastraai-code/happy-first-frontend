'use client';

import { useMemo, useState } from 'react';
import polyline from '@mapbox/polyline';
import { Loader2 } from 'lucide-react';
import { TrackerMap } from './TrackerMap';

interface RouteReplayProps {
  encodedRoute?: string;
  points?: { lat: number; lng: number }[];
  loading?: boolean;
  className?: string;
}

export default function RouteReplay({
  encodedRoute,
  points: pointsProp,
  loading = false,
  className = 'h-64 w-full',
}: RouteReplayProps) {
  const path = useMemo(() => {
    if (pointsProp?.length) return pointsProp;
    if (!encodedRoute) return [];
    try {
      return polyline.decode(encodedRoute).map(([lat, lng]: [number, number]) => ({ lat, lng }));
    } catch {
      return [];
    }
  }, [encodedRoute, pointsProp]);

  const [progress, setProgress] = useState(100);
  const visible = useMemo(() => {
    if (!path.length) return [];
    if (path.length === 1) return path;
    const count = Math.max(2, Math.round((path.length * progress) / 100));
    return path.slice(0, count);
  }, [path, progress]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-secondary text-sm text-muted-foreground ${className}`}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading route…
      </div>
    );
  }

  if (!path.length) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl bg-secondary px-4 text-center text-sm text-muted-foreground ${className}`}
      >
        <p>No route data available</p>
        <p className="text-xs">Stationary or indoor workouts may not record a GPS path.</p>
      </div>
    );
  }

  if (path.length === 1) {
    return (
      <div className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-border">
          <TrackerMap points={[]} livePosition={path[0]} follow={false} className={className} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Single location recorded — short or stationary workout
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border">
        <TrackerMap points={visible} follow={false} className={className} />
      </div>
      <div className="rounded-xl bg-surface px-3 py-2.5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Route replay</span>
          <span>{progress}%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-primary"
          aria-label="Route replay progress"
        />
      </div>
    </div>
  );
}
