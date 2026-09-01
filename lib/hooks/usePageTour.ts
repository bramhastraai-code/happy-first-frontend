'use client';

import { useEffect, useState } from 'react';

/** Per-page guided tour state with localStorage completion key. */
export function usePageTour(storageKey: string) {
  const [runTour, setRunTour] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleStartTour = () => setRunTour(true);

  const handleTourFinish = () => {
    setRunTour(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  };

  return { runTour, isMounted, handleStartTour, handleTourFinish };
}
