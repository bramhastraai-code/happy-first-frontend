'use client';

import { Quote } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { getDailyMotivationQuote } from '@/components/home/DailyMotivationQuote';

/** Inline motivation strip on Home (pairs with the once-per-day popup). */
export function HomeMotivationCard() {
  const profileId = useAuthStore((s) => s.selectedProfile?._id);
  const quote = getDailyMotivationQuote(profileId);

  return (
    <div className="section-card overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-surface p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Quote className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            My motivation
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{quote}</p>
        </div>
      </div>
    </div>
  );
}
