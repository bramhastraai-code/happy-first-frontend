import Link from 'next/link';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export const metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-primary-soft via-background to-primary-soft px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-xl font-extrabold tracking-tight text-white shadow-lg shadow-[var(--shadow-float)]">
        HF
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">{BRAND_NAME}</h1>
      <p className="mt-2 max-w-sm text-sm text-stone-600">{BRAND_TAGLINE}</p>
      <p className="mt-6 max-w-sm text-base text-stone-700">
        You&apos;re offline right now. Check your connection, then try again.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover"
      >
        Try again
      </Link>
    </main>
  );
}
