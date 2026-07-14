'use client';

import { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import polyline from '@mapbox/polyline';
import { Loader2, Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ActivityStats from '@/components/tracker/ActivityStats';
import RouteReplay from '@/components/tracker/RouteReplay';
import TrackerHeader from '@/components/tracker/TrackerHeader';
import { Button } from '@/components/ui/button';
import { useDeleteSession, useSessionDetail, useSessionRoute } from '@/lib/tracker/hooks/useActivity';
import { ACTIVITY_META } from '@/lib/tracker/activityMeta';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';

export default function TrackerSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { data: session, isLoading } = useSessionDetail(id);
  const deleteSession = useDeleteSession();
  const needsRouteFetch = Boolean(session && !session.routePreview);
  const { data: routeData, isLoading: routeLoading } = useSessionRoute(id, needsRouteFetch);

  const routePoints = useMemo(() => {
    if (session?.routePreview) {
      try {
        return polyline
          .decode(session.routePreview)
          .map(([lat, lng]: [number, number]) => ({ lat, lng }));
      } catch {
        return [];
      }
    }
    return routeData?.points.map((p) => ({ lat: p.lat, lng: p.lng })) ?? [];
  }, [session?.routePreview, routeData?.points]);

  const meta = session ? ACTIVITY_META[session.activityType] : null;
  const Icon = meta?.icon;

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this workout from your history? This cannot be undone.');
    if (!confirmed) return;

    await deleteSession.mutateAsync(id);
    router.push('/tracker/history');
  };

  return (
    <MainLayout>
      <div className="space-y-5 py-4 sm:space-y-6 sm:py-6">
        <TrackerHeader title="Workout details" backHref="/tracker/history" backLabel="Back to history" />

        {isLoading && (
          <div className="space-y-3">
            <div className="section-card h-8 w-40 animate-pulse bg-secondary/40" />
            <div className="section-card h-72 animate-pulse bg-secondary/40" />
          </div>
        )}

        {session && meta && Icon && (
          <>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
                  meta.softClass
                )}
              >
                <Icon className={cn('h-6 w-6', meta.iconClass)} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold capitalize text-foreground">{session.activityType}</h2>
                <p className="text-sm text-muted-foreground">
                  {DateTime.fromISO(session.startedAt).toFormat('EEEE, d LLL yyyy · h:mm a')}
                </p>
              </div>
            </div>

            <RouteReplay
              points={routePoints}
              loading={needsRouteFetch && routeLoading}
              className="h-56 w-full rounded-2xl sm:h-72"
            />

            {session.metrics && <ActivityStats metrics={session.metrics} variant="compact" />}

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleteSession.isPending}
              onClick={handleDelete}
            >
              {deleteSession.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete workout
            </Button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
