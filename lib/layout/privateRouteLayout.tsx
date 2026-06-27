import type { Metadata } from 'next';
import { privateRouteMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = privateRouteMetadata;

export default function PrivateRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
