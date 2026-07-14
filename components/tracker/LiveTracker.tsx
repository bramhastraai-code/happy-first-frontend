'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pause, Play, Share2, Square, WifiOff, Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ActivityStats from './ActivityStats';
import ActivityTypePicker from './ActivityTypePicker';
import { TrackerMap } from './TrackerMap';
import { useTracking } from '@/lib/tracker/hooks/useTracking';
import { useLiveShare } from '@/lib/tracker/hooks/useLiveShare';
import { ACTIVITY_META } from '@/lib/tracker/activityMeta';
import type { ActivityType } from '@/lib/tracker/types';
import { cn } from '@/lib/utils';

export default function LiveTracker() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [startingType, setStartingType] = useState<ActivityType | null>(null);
  const tracking = useTracking();
  const isSharing = ['active', 'paused'].includes(tracking.status) && Boolean(tracking.shareCode);
  const { publishPosition, connected, joined, canPublish, shareError } = useLiveShare(
    tracking.shareCode,
    isSharing,
    true
  );
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (tracking.status !== 'active' || !tracking.points.length || !canPublish) return;
    const last = tracking.points[tracking.points.length - 1];
    publishPosition(last.lat, last.lng, last.speed ?? undefined, last.heading ?? undefined);
  }, [tracking.points, tracking.status, publishPosition, canPublish]);

  const mapPoints = tracking.points.map((p) => ({ lat: p.lat, lng: p.lng }));
  const isIdle = tracking.status === 'idle';
  const activityMeta = ACTIVITY_META[tracking.activityType];
  const ActivityIcon = activityMeta.icon;

  const liveMapPosition =
    tracking.status === 'active'
      ? tracking.liveFix
      : mapPoints.length
        ? mapPoints[mapPoints.length - 1]
        : tracking.liveFix;

  const gpsStatusLabel =
    tracking.fixQuality === 'good'
      ? `GPS good · ±${Math.round(tracking.accuracy ?? 0)}m`
      : tracking.fixQuality === 'fair'
        ? `GPS fair · ±${Math.round(tracking.accuracy ?? 0)}m`
        : tracking.fixQuality === 'weak'
          ? `GPS weak · ±${Math.round(tracking.accuracy ?? 0)}m`
          : 'Searching for GPS…';

  const handleCopyShareLink = async () => {
    if (!tracking.shareCode) return;
    const url = `${window.location.origin}/tracker/live/share/${tracking.shareCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2500);
    } catch {
      window.prompt('Copy this share link:', url);
    }
  };

  const handleStart = async (type: ActivityType) => {
    setStartingType(type);
    try {
      await tracking.start(type);
    } finally {
      setStartingType(null);
    }
  };

  if (tracking.isRestoring) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Checking for active workout…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="relative min-h-0 flex-1">
        <TrackerMap
          points={mapPoints}
          livePosition={liveMapPosition}
          follow
          className="h-full w-full"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => router.push('/tracker')}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-stone-900/55 text-white shadow-lg backdrop-blur-md transition hover:bg-stone-900/70"
            aria-label="Back to tracker"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {!isIdle && (
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-stone-900/55 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                <ActivityIcon className="h-3.5 w-3.5" />
                <span className="capitalize">{tracking.activityType}</span>
                <span
                  className={cn(
                    'ml-1 h-1.5 w-1.5 rounded-full',
                    tracking.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                  )}
                />
                <span>{tracking.status === 'active' ? 'Live' : 'Paused'}</span>
              </div>
              {tracking.status === 'active' && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white shadow-lg backdrop-blur-md',
                    tracking.fixQuality === 'good'
                      ? 'bg-emerald-600/85'
                      : tracking.fixQuality === 'fair'
                        ? 'bg-sky-600/85'
                        : tracking.fixQuality === 'weak'
                          ? 'bg-amber-600/85'
                          : 'bg-stone-700/85'
                  )}
                >
                  <Navigation className="h-3 w-3" />
                  {gpsStatusLabel}
                </div>
              )}
            </div>
          )}
        </div>

        {mounted && (tracking.isOffline || tracking.isSyncing) && (
          <div className="absolute left-3 right-3 top-[calc(3.75rem+env(safe-area-inset-top))] z-10 flex items-center justify-center gap-1.5 rounded-full bg-stone-900/80 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur-sm">
            {tracking.isOffline ? (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                Offline — saving locally
              </>
            ) : (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing…
              </>
            )}
          </div>
        )}

        {mounted && tracking.locationError && (
          <div className="absolute bottom-4 left-3 right-3 z-10 rounded-2xl bg-destructive/95 px-4 py-3 text-xs leading-relaxed text-white shadow-lg">
            {tracking.locationError}
          </div>
        )}
      </div>

      <div className="shrink-0 rounded-t-3xl border-t border-border bg-surface shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        <div className="mx-auto w-full max-w-lg px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:max-w-2xl">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />

          {isIdle ? (
            <div className="space-y-4">
              {tracking.permission === 'denied' && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Location access needed</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Allow location for this site in your browser settings, then tap below to try again.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3 h-9 rounded-xl"
                        onClick={() => void tracking.requestPermission()}
                      >
                        Allow location
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {tracking.permission !== 'denied' && (
                <div className="rounded-2xl border border-primary/20 bg-primary-soft/40 p-4">
                  <div className="flex items-start gap-3">
                    <Navigation className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">GPS workout tracking</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        When you start, your browser will ask for location access. We only record movement
                        when you actually move — sitting still won&apos;t draw a zig-zag route.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ActivityTypePicker onSelect={handleStart} startingType={startingType} />
            </div>
          ) : (
            <div className="space-y-4">
              <ActivityStats metrics={tracking.liveMetrics} variant="live" />

              {tracking.status === 'active' && tracking.isStationary && (
                <p className="text-center text-xs text-muted-foreground">
                  You appear stationary — timer still runs, but the route won&apos;t jump around.
                </p>
              )}

              <div className="flex gap-2">
                {tracking.status === 'active' && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 flex-1 rounded-2xl text-base font-semibold"
                    onClick={() => tracking.pause()}
                  >
                    <Pause className="mr-1.5 h-5 w-5" />
                    Pause
                  </Button>
                )}
                {tracking.status === 'paused' && (
                  <Button
                    size="lg"
                    className="h-12 flex-1 rounded-2xl text-base font-semibold"
                    onClick={() => tracking.resume()}
                  >
                    <Play className="mr-1.5 h-5 w-5" />
                    Resume
                  </Button>
                )}
                <Button
                  size="lg"
                  className="h-12 flex-1 rounded-2xl bg-primary text-base font-semibold hover:bg-primary/90"
                  onClick={() => tracking.stop()}
                >
                  <Square className="mr-1.5 h-4 w-4 fill-current" />
                  Finish
                </Button>
              </div>

              {tracking.shareCode && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 flex-1 rounded-xl border"
                      onClick={handleCopyShareLink}
                    >
                      <Share2 className="mr-1.5 h-4 w-4" />
                      {shareCopied ? 'Link copied!' : 'Copy share link'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 flex-1 rounded-xl border"
                      asChild
                    >
                      <Link href={`/tracker/live/share/${tracking.shareCode}`} target="_blank" rel="noreferrer">
                        Preview
                      </Link>
                    </Button>
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {canPublish
                      ? 'Live sharing active — send the link to family or friends'
                      : connected
                        ? joined
                          ? 'Connecting share channel…'
                          : 'Joining share channel…'
                        : 'Connecting to share server…'}
                  </p>
                  {shareError && (
                    <p className="text-center text-[11px] text-destructive">{shareError}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 flex-1 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => tracking.cancel()}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
