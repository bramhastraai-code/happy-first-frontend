import Link from 'next/link';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export const metadata = {
  title: 'Offline',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[linear-gradient(160deg,#fff7ed_0%,#f6f7f9_45%,#ffedd5_100%)] px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-xl font-extrabold tracking-tight text-white shadow-lg shadow-orange-500/30">
        HF
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">{BRAND_NAME}</h1>
      <p className="mt-2 max-w-sm text-sm text-stone-600">{BRAND_TAGLINE}</p>
      <p className="mt-6 max-w-sm text-base text-stone-700">
        You&apos;re offline right now. Check your connection, then try again.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
      >
        Try again
      </Link>
    </main>
  );
}
