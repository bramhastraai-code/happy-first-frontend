import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ArrowLeft, Home } from 'lucide-react';
import { privateRouteMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = {
  ...privateRouteMetadata,
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12">
      <BrandLogo href="/" size="lg" className="mb-10" />

      <p className="text-[7rem] font-bold leading-none tracking-tighter text-primary/15 sm:text-[9rem]">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
        This page doesn&apos;t exist or may have moved. Return to the homepage or sign in to continue.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="h-4 w-4" />
            Go to homepage
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </Link>
        </Button>
      </div>
    </div>
  );
}
