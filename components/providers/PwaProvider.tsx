'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import type { ReactNode } from 'react';

export default function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === 'development'}
    >
      {children}
    </SerwistProvider>
  );
}
