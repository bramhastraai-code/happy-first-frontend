'use client';

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { ReactNode } from 'react';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  children?: ReactNode;
  className?: string;
  mapId?: string;
}

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = 15,
  children,
  className = 'h-full w-full',
  mapId = 'happy-first-tracker',
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  if (!apiKey) {
    return (
      <div className={`flex items-center justify-center bg-secondary text-sm text-muted-foreground ${className}`}>
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId={mapId}
        className={className}
      >
        {children}
      </Map>
    </APIProvider>
  );
}

export function UserMarker({ position }: { position: { lat: number; lng: number } }) {
  return (
    <AdvancedMarker position={position}>
      <Pin background="#ea580c" borderColor="#9a3412" glyphColor="#fff" />
    </AdvancedMarker>
  );
}
