'use client';

import type { LiveMetrics, WorkoutMetrics } from '@/lib/tracker/types';
import {
  formatDistance,
  formatDuration,
  formatPace,
} from '@/lib/tracker/utils/metrics';
import { cn } from '@/lib/utils';

interface ActivityStatsProps {
  metrics: LiveMetrics | WorkoutMetrics;
  variant?: 'full' | 'compact' | 'live';
}

const STAT_ITEMS = [
  { key: 'distanceM', label: 'Distance', format: (m: LiveMetrics) => formatDistance(m.distanceM) },
  { key: 'durationSec', label: 'Duration', format: (m: LiveMetrics) => formatDuration(m.durationSec) },
  {
    key: 'movingTimeSec',
    label: 'Moving',
    format: (m: LiveMetrics) => formatDuration(m.movingTimeSec),
  },
  { key: 'paceMinPerKm', label: 'Pace', format: (m: LiveMetrics) => formatPace(m.paceMinPerKm) },
  {
    key: 'avgSpeedKmh',
    label: 'Avg speed',
    format: (m: LiveMetrics) => `${m.avgSpeedKmh.toFixed(1)} km/h`,
  },
  {
    key: 'maxSpeedKmh',
    label: 'Max speed',
    format: (m: LiveMetrics) => `${m.maxSpeedKmh.toFixed(1)} km/h`,
  },
  { key: 'calories', label: 'Calories', format: (m: LiveMetrics) => `${m.calories} kcal` },
  { key: 'steps', label: 'Steps', format: (m: LiveMetrics) => m.steps.toLocaleString('en-IN') },
  {
    key: 'elevationGainM',
    label: 'Elevation',
    format: (m: LiveMetrics) => `${m.elevationGainM.toFixed(0)} m`,
  },
] as const;

const LIVE_KEYS = ['distanceM', 'durationSec', 'paceMinPerKm'] as const;

export default function ActivityStats({ metrics, variant = 'full' }: ActivityStatsProps) {
  if (variant === 'live') {
    return (
      <div className="grid grid-cols-3 gap-2">
        {LIVE_KEYS.map((key) => {
          const item = STAT_ITEMS.find((s) => s.key === key)!;
          return (
            <div
              key={key}
              className="rounded-2xl bg-secondary/60 px-2 py-3 text-center"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {item.format(metrics as LiveMetrics)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  const items =
    variant === 'compact'
      ? STAT_ITEMS.filter((item) =>
          ['distanceM', 'durationSec', 'paceMinPerKm', 'calories', 'avgSpeedKmh', 'elevationGainM'].includes(
            item.key
          )
        )
      : STAT_ITEMS;

  return (
    <div
      className={cn(
        'grid gap-2',
        variant === 'compact' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="rounded-xl border border-border bg-surface px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
            {item.format(metrics as LiveMetrics)}
          </p>
        </div>
      ))}
    </div>
  );
}
