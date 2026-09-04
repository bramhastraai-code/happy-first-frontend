'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CalendarPlus, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import TourStartButton from '@/components/ui/TourStartButton';

export type CreatePlanFabMode = 'create' | 'log';

interface CreatePlanFabProps {
  hidden?: boolean;
  /** `create` → weekly plan; `log` → today's activity log on Tasks */
  mode?: CreatePlanFabMode;
  /** Sat/Sun: show plan + log buttons together */
  weekendDual?: boolean;
  className?: string;
  /** Social-style tour control stacked above the plan button. */
  onTour?: () => void;
}

/** Viewport-fixed action button(s) — sits above the bottom nav. */
export default function CreatePlanFab({
  hidden = false,
  mode = 'create',
  weekendDual = false,
  className,
  onTour,
}: CreatePlanFabProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || hidden || typeof document === 'undefined') return null;

  const isLog = mode === 'log';
  const label = isLog ? 'Submit daily log' : 'Create plan';
  const href = isLog ? '/tasks' : '/create-plan';
  const Icon = isLog ? ClipboardList : CalendarPlus;

  const planButtons = weekendDual ? (
    <>
      <button
        type="button"
        onClick={() => router.push('/create-plan?weekTarget=next')}
        aria-label="Create next week plan"
        className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface py-2 pl-2 pr-4 text-foreground shadow-[var(--shadow-float)] transition hover:bg-secondary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CalendarPlus className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-sm font-semibold">Next week plan</span>
      </button>
      <button
        type="button"
        onClick={() => router.push('/tasks')}
        aria-label="Submit daily log"
        className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary py-2 pl-2 pr-4 text-primary-foreground shadow-[var(--shadow-float)] transition hover:bg-primary-hover"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <ClipboardList className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="text-sm font-semibold">Submit daily log</span>
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => router.push(href)}
      aria-label={label}
      className="create-plan-fab flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary py-2 pl-2 pr-4 text-primary-foreground shadow-[var(--shadow-float)] transition hover:bg-primary-hover"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );

  return createPortal(
    <div
      className={cn(
        'fixed right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2.5',
        'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]',
        className
      )}
    >
      {onTour ? <TourStartButton inline onClick={onTour} /> : null}
      {planButtons}
    </div>,
    document.body
  );
}
