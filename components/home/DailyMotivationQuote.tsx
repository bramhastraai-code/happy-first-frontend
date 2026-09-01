'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Quote, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';

const HAPPINESS_QUOTES = [
  'Happiness grows when you show up for yourself today.',
  'Small joyful steps create lasting change.',
  'I am good and getting better.',
  'Consistency is kindness to your future self.',
  'My peace matters — I choose Happy First.',
  'Gratitude turns what I have into enough.',
  'I celebrate progress, not perfection.',
  'A calm mind makes room for real joy.',
  'Today I plant seeds of happiness with every action.',
  'I am proud of the care I give myself.',
  'Joy is found in the effort, not only the outcome.',
  'I move gently, I rest wisely, I live happily.',
  'One mindful habit can brighten the whole day.',
  'I deserve rest, movement, and moments of delight.',
  'Happiness is a practice — and I practice today.',
];

function storageKey(profileId: string, dayKey: string) {
  return `hf-daily-quote:${profileId}:${dayKey}`;
}

function dayKeyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pickQuote(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return HAPPINESS_QUOTES[hash % HAPPINESS_QUOTES.length];
}

export function getDailyMotivationQuote(profileId?: string | null) {
  const today = dayKeyLocal();
  return pickQuote(`${profileId || 'guest'}:${today}`);
}

interface DailyMotivationQuoteProps {
  /** When true, skip showing (e.g. guided tour running) */
  suppressed?: boolean;
}

/**
 * Once-per-day happiness affirmation popup on Home.
 */
export function DailyMotivationQuote({ suppressed = false }: DailyMotivationQuoteProps) {
  const { selectedProfile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const profileId = selectedProfile?._id || '';
  const today = dayKeyLocal();

  const quote = useMemo(
    () => pickQuote(`${profileId || 'guest'}:${today}`),
    [profileId, today]
  );

  useEffect(() => {
    if (suppressed || !profileId || typeof window === 'undefined') return;
    const key = storageKey(profileId, today);
    try {
      if (window.localStorage.getItem(key)) return;
      setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [profileId, today, suppressed]);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (!profileId) return;
    try {
      window.localStorage.setItem(storageKey(profileId, today), '1');
    } catch {
      /* ignore quota */
    }
  }, [profileId, today]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const dismissOnScroll = () => {
      dismiss();
    };

    window.addEventListener('scroll', dismissOnScroll, { passive: true, capture: true });
    window.addEventListener('wheel', dismissOnScroll, { passive: true, capture: true });
    window.addEventListener('touchmove', dismissOnScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', dismissOnScroll, { capture: true });
      window.removeEventListener('wheel', dismissOnScroll, { capture: true });
      window.removeEventListener('touchmove', dismissOnScroll, { capture: true });
    };
  }, [open, dismiss]);

  if (!open || suppressed) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/40"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-label="Daily happiness affirmation"
        className="relative z-[1] w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)]"
      >
        <div className="bg-gradient-to-br from-primary-soft via-surface to-surface px-5 pb-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Quote className="h-5 w-5" />
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Daily happiness affirmation
          </p>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{quote}</p>
          <Button className="mt-5 w-full" onClick={dismiss}>
            Carry this into today
          </Button>
        </div>
      </div>
    </div>
  );
}
