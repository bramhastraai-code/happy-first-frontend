'use client';

import { use } from 'react';
import { Loader2, MapPin, WifiOff } from 'lucide-react';
import { TrackerMap } from '@/components/tracker/TrackerMap';
import { useLiveShare } from '@/lib/tracker/hooks/useLiveShare';

export default function LiveSharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { lastPosition, connected, joined, shareError } = useLiveShare(code, true, false);

  const position = lastPosition
    ? { lat: lastPosition.lat, lng: lastPosition.lng }
    : undefined;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="border-b border-border bg-surface px-4 py-3 text-center">
        <p className="text-sm font-semibold text-foreground">Live location share</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {shareError
            ? shareError
            : joined
              ? lastPosition
                ? 'Receiving live updates'
                : 'Connected — waiting for location'
              : connected
                ? 'Joining session…'
                : 'Connecting…'}
        </p>
      </div>

      <div className="relative min-h-0 flex-1">
        {position ? (
          <TrackerMap points={[position]} follow className="h-full w-full" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            {shareError ? (
              <WifiOff className="h-8 w-8 text-destructive" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {shareError ? 'Unable to load live share' : 'Waiting for location updates…'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {shareError
                  ? 'The workout may have ended or the link is invalid.'
                  : 'Ask the athlete to keep their workout screen open while sharing.'}
              </p>
            </div>
          </div>
        )}

        {position && (
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </span>
            </div>
            {lastPosition?.speed != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Speed: {(lastPosition.speed * 3.6).toFixed(1)} km/h
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
