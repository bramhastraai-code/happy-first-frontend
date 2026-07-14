'use client';

import TrackerAutoRefresh from './TrackerAutoRefresh';

export default function TrackerShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TrackerAutoRefresh />
      {children}
    </>
  );
}
