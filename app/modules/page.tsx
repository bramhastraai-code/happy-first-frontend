'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, LayoutGrid } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { AppPageHeader, headerBackBtnClass } from '@/components/ui/AppPageHeader';
import { AppQuickLinks } from '@/components/nav/AppQuickLinks';
import { PlatformHowToSteps } from '@/components/nav/PlatformHowToSteps';
import { UserMascot } from '@/components/ui/UserMascot';

/**
 * Full app modules map — every major area with how-to steps + quick links.
 */
export default function ModulesOverviewPage() {
  const router = useRouter();

  return (
    <MainLayout>
      <AppPageHeader
        showAvatar={false}
        subtitleTone="label"
        subtitle="Happy First"
        title={
          <span className="inline-flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            All modules
          </span>
        }
        leading={
          <button
            type="button"
            onClick={() => router.back()}
            className={headerBackBtnClass}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-surface px-3 py-3">
        <UserMascot size={56} />
        <p className="min-w-0 self-center text-sm text-muted-foreground">
          Follow the steps below to learn every module, or jump straight to any area.
        </p>
      </div>

      <div className="space-y-6">
        <PlatformHowToSteps />

        <section aria-label="Jump to module">
          <h2 className="mb-3 text-base font-semibold text-foreground">All modules</h2>
          <AppQuickLinks columns={1} />
        </section>
      </div>
    </MainLayout>
  );
}
