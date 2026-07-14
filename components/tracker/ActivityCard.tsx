'use client';

import Link from 'next/link';
import { DateTime } from 'luxon';
import { ChevronRight, Loader2, Trash2 } from 'lucide-react';
import type { WorkoutSession } from '@/lib/tracker/types';
import { ACTIVITY_META } from '@/lib/tracker/activityMeta';
import { formatDistance, formatDuration } from '@/lib/tracker/utils/metrics';
import { TrackerMap } from './TrackerMap';
import { cn } from '@/lib/utils';

interface ActivityCardProps {
  session: WorkoutSession;
  compact?: boolean;
  onDelete?: (sessionId: string) => void;
  deleting?: boolean;
}

export default function ActivityCard({
  session,
  compact = false,
  onDelete,
  deleting = false,
}: ActivityCardProps) {
  const m = session.metrics;
  const dateLabel = DateTime.fromISO(session.startedAt).toFormat('d LLL, h:mm a');
  const meta = ACTIVITY_META[session.activityType];
  const Icon = meta.icon;

  return (
    <div className="app-card-hover relative overflow-hidden">
      {onDelete && (
        <button
          type="button"
          disabled={deleting}
          onClick={() => onDelete(session._id)}
          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-stone-900/55 text-white shadow-lg backdrop-blur-md transition hover:bg-destructive/90 disabled:opacity-60"
          aria-label="Delete workout"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      )}

      <Link
        href={`/tracker/session/${session._id}`}
        className="block active:scale-[0.99]"
      >
        <div className={cn('relative w-full overflow-hidden', compact ? 'h-24' : 'h-32')}>
          <TrackerMap
            encodedRoute={session.routePreview}
            points={[]}
            follow={false}
            className="pointer-events-none h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm">
            <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full', meta.softClass)}>
              <Icon className="h-3 w-3" />
            </span>
            <span className="capitalize">{session.activityType}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
            {m ? (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-foreground">
                <span>{formatDistance(m.distanceM)}</span>
                <span className="text-muted-foreground">·</span>
                <span>{formatDuration(m.durationSec)}</span>
                <span className="text-muted-foreground">·</span>
                <span>{m.calories} kcal</span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No metrics recorded</p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    </div>
  );
}
