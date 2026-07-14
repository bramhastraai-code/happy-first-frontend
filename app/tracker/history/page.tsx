'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import ActivityCard from '@/components/tracker/ActivityCard';
import TrackerHeader from '@/components/tracker/TrackerHeader';
import { Button } from '@/components/ui/button';
import { useDeleteSession, useSessionHistory } from '@/lib/tracker/hooks/useActivity';
import type { ActivityType } from '@/lib/tracker/types';
import { cn } from '@/lib/utils';
import { MapPin, Play } from 'lucide-react';

const FILTERS: { id: ActivityType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'run', label: 'Run' },
  { id: 'walk', label: 'Walk' },
  { id: 'cycle', label: 'Cycle' },
  { id: 'hike', label: 'Hike' },
];

export default function TrackerHistoryPage() {
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteSession = useDeleteSession();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useSessionHistory({
    status: 'completed',
    activityType: filter === 'all' ? undefined : filter,
    limit: 10,
  });

  const sessions = data?.pages.flatMap((p) => p.items) ?? [];

  const handleDelete = async (sessionId: string) => {
    const confirmed = window.confirm('Delete this workout from your history? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(sessionId);
    try {
      await deleteSession.mutateAsync(sessionId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 py-4 sm:space-y-5 sm:py-6">
        <TrackerHeader title="Workout history" subtitle="Your completed GPS sessions" />

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                filter === f.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-surface text-muted-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="section-card h-40 animate-pulse bg-secondary/40" />
            ))}
          </div>
        ) : sessions.length ? (
          <div className="space-y-3">
            {sessions.map((s) => (
              <ActivityCard
                key={s._id}
                session={s}
                onDelete={handleDelete}
                deleting={deletingId === s._id}
              />
            ))}
            {hasNextPage && (
              <Button
                variant="outline"
                className="h-11 w-full rounded-xl"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            )}
          </div>
        ) : (
          <div className="section-card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <MapPin className="h-7 w-7" />
            </span>
            <div>
              <p className="font-semibold text-foreground">No workouts found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === 'all'
                  ? 'Complete a GPS session to see it here.'
                  : `No ${filter} workouts yet. Try another filter or start a new session.`}
              </p>
            </div>
            <Button asChild className="h-11 rounded-xl">
              <Link href="/tracker/live">
                <Play className="mr-1.5 h-4 w-4" />
                Start workout
              </Link>
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
