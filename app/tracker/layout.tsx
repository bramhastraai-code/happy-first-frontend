import TrackerShell from './TrackerShell';

export { metadata } from '@/lib/layout/privateRouteLayout';

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <TrackerShell>{children}</TrackerShell>;
}
