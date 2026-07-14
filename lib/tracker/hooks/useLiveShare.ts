'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ensureValidAccessToken } from '@/lib/auth/tokenManager';
import { getSocketBaseUrl } from '@/lib/tracker/utils/socketUrl';

export interface LivePosition {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  at?: number;
}

export function useLiveShare(shareCode: string | null, enabled: boolean, publish = false) {
  const socketRef = useRef<Socket | null>(null);
  const shareCodeRef = useRef(shareCode);
  shareCodeRef.current = shareCode;

  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [lastPosition, setLastPosition] = useState<LivePosition | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !shareCode) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setJoined(false);
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;

    const connect = async () => {
      const token = publish ? await ensureValidAccessToken() : getViewerToken();
      if (cancelled) return;

      socket = io(getSocketBaseUrl(), {
        auth: token ? { token } : {},
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
      });

      socket.on('connect', () => {
        if (cancelled) return;
        setConnected(true);
        setShareError(null);
        socket?.emit('join_share', { shareCode });
      });

      socket.on('disconnect', () => {
        setConnected(false);
        setJoined(false);
      });

      socket.on('share_joined', () => {
        if (cancelled) return;
        setJoined(true);
        setShareError(null);
      });

      socket.on('share_error', (payload: { message?: string }) => {
        if (cancelled) return;
        setShareError(payload?.message || 'Unable to join live share');
        setJoined(false);
      });

      socket.on('live_position', (pos: LivePosition) => {
        if (cancelled) return;
        setLastPosition(pos);
      });

      socketRef.current = socket;
    };

    void connect();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setJoined(false);
    };
  }, [enabled, shareCode, publish]);

  const publishPosition = useCallback(
    (lat: number, lng: number, speed?: number, heading?: number) => {
      const socket = socketRef.current;
      const code = shareCodeRef.current;
      if (!socket?.connected || !code) return false;
      socket.emit('share_position', { shareCode: code, lat, lng, speed, heading });
      return true;
    },
    []
  );

  return {
    lastPosition,
    publishPosition,
    connected,
    joined,
    shareError,
    canPublish: publish && connected && joined,
  };
}

function getViewerToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
