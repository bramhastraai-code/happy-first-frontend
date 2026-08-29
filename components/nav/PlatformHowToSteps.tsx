'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  PLATFORM_HOW_TO_INTRO,
  PLATFORM_STEPS,
} from '@/lib/content/platformSteps';

/** Numbered how-to covering all major modules. */
export function PlatformHowToSteps() {
  return (
    <section aria-label="Steps to use the platform" className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          {PLATFORM_HOW_TO_INTRO.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {PLATFORM_HOW_TO_INTRO.subtitle}
        </p>
      </div>

      <ol className="section-card divide-y divide-border overflow-hidden">
        {PLATFORM_STEPS.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {step.step}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {step.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {step.body}
                </span>
                <span className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                  {step.cta}
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
