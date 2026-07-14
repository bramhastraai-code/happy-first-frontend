'use client';

import polyline from '@mapbox/polyline';
import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import MapView, { UserMarker } from './MapView';

function PolylineOverlay({
  path,
  autoFitBounds,
}: {
  path: { lat: number; lng: number }[];
  autoFitBounds: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length < 2) return;
    const line = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#ea580c',
      strokeOpacity: 0.9,
      strokeWeight: 5,
    });
    line.setMap(map);
    if (autoFitBounds) {
      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 48);
    }
    return () => line.setMap(null);
  }, [map, path, autoFitBounds]);

  return null;
}

function FollowCenter({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(position);
  }, [map, position.lat, position.lng]);

  return null;
}

interface TrackerMapProps {
  points: { lat: number; lng: number }[];
  encodedRoute?: string;
  follow?: boolean;
  livePosition?: { lat: number; lng: number } | null;
  className?: string;
}

export function TrackerMap({
  points,
  encodedRoute,
  follow = true,
  livePosition,
  className,
}: TrackerMapProps) {
  let path = points;
  if (!path.length && encodedRoute) {
    try {
      path = polyline.decode(encodedRoute).map(([lat, lng]: [number, number]) => ({ lat, lng }));
    } catch {
      path = [];
    }
  }

  const markerPosition = livePosition ?? (path.length ? path[path.length - 1] : undefined);
  const isLive = Boolean(livePosition);

  return (
    <MapView center={markerPosition} className={className}>
      {path.length >= 2 && <PolylineOverlay path={path} autoFitBounds={!isLive} />}
      {follow && markerPosition && <FollowCenter position={markerPosition} />}
      {markerPosition && <UserMarker position={markerPosition} />}
    </MapView>
  );
}
