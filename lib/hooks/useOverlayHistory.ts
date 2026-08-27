'use client';

import { useEffect, useRef } from 'react';

type OverlayHistoryOptions = {
  open: boolean;
  onClose: () => void;
  /** Unique key so stacked overlays don't conflict */
  key?: string;
};

/**
 * When an overlay opens, push a history entry so browser/Android back
 * closes the overlay instead of leaving the page (e.g. jumping to /home).
 */
export function useOverlayHistory({ open, onClose, key = 'overlay' }: OverlayHistoryOptions) {
  const pushedRef = useRef(false);
  const closingViaBackRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (open && !pushedRef.current) {
      window.history.pushState({ __hfOverlay: key }, '');
      pushedRef.current = true;
    }

    if (!open && pushedRef.current) {
      pushedRef.current = false;
      if (!closingViaBackRef.current) {
        // Closed via in-app UI — drop the synthetic history entry
        if (window.history.state?.__hfOverlay === key) {
          window.history.back();
        }
      }
      closingViaBackRef.current = false;
    }
  }, [open, key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPopState = () => {
      if (!pushedRef.current) return;
      pushedRef.current = false;
      closingViaBackRef.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [key]);
}
