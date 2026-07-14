'use client';

import { CalendarDays, Flame, Footprints, Route, Timer } from 'lucide-react';
import type { DashboardStats as DashboardStatsType } from '@/lib/tracker/types';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  stats?: DashboardStatsType;
  loading?: boolean;
}

function formatDistanceKm(km: number) {
  if (km <= 0) return '0 m';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Route;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-background/80 p-2.5">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardStats({ stats, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="section-card h-36 animate-pulse bg-secondary/40" />
        ))}
      </div>
    );
  }
  if (!stats) return null;

  const cards = [
    { label: 'This week', data: stats.weekly.totals, accent: 'from-orange-50 to-surface' },
    { label: 'This month', data: stats.monthly.totals, accent: 'from-amber-50/80 to-surface' },
  ];

  return (
    <div className="grid gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn('section-card overflow-hidden bg-gradient-to-br p-4', card.accent)}
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatTile label="Distance" value={formatDistanceKm(card.data.distanceKm)} icon={Route} />
            <StatTile label="Duration" value={`${card.data.durationMin} min`} icon={Timer} />
            <StatTile label="Sessions" value={String(card.data.sessions)} icon={Footprints} />
            <StatTile label="Calories" value={String(card.data.calories)} icon={Flame} />
          </div>
        </div>
      ))}
    </div>
  );
}
