'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  Clock,
  Loader2,
  PauseCircle,
  PlusCircle,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { weeklyPlanAPI, type PlanChoiceState } from '@/lib/api/weeklyPlan';
import { cn } from '@/lib/utils';

const WEEKDAY_LABEL: Record<number, string> = {
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

interface WeekendPlanPromptContentProps {
  weekendPrompt: NonNullable<PlanChoiceState['weekendPrompt']>;
  onResolved?: () => void;
  onDismiss?: () => void;
  className?: string;
  showClose?: boolean;
}

export function WeekendPlanPromptContent({
  weekendPrompt,
  onResolved,
  onDismiss,
  className,
  showClose = false,
}: WeekendPlanPromptContentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<'pause' | 'remind' | 'repeat' | null>(null);
  const [error, setError] = useState('');
  const [doneMessage, setDoneMessage] = useState('');

  const dayLabel = WEEKDAY_LABEL[weekendPrompt.weekday] || 'Weekend';

  const handleRepeat = async () => {
    setLoading('repeat');
    setError('');
    try {
      await weeklyPlanAPI.repeatLastWeek({ weekTarget: 'next' });
      setDoneMessage('Next week plan copied from last week.');
      onResolved?.();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not copy last week’s plan.'
      );
    } finally {
      setLoading(null);
    }
  };

  const handlePause = async () => {
    setLoading('pause');
    setError('');
    try {
      await weeklyPlanAPI.pauseNextWeek();
      setDoneMessage('Next week paused.');
      onResolved?.();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not pause next week.'
      );
    } finally {
      setLoading(null);
    }
  };

  const handleRemindLater = async () => {
    setLoading('remind');
    setError('');
    try {
      await weeklyPlanAPI.snoozeWeekendPrompt();
      setDoneMessage('Okay — we will ask again later (before Monday).');
      onResolved?.();
      onDismiss?.();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not snooze this reminder.'
      );
    } finally {
      setLoading(null);
    }
  };

  if (doneMessage) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800',
          className
        )}
      >
        {doneMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {dayLabel} · Next week
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">
            Set up next week&apos;s plan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a fresh plan, copy last week
            {weekendPrompt.canRemindLater ? ', pause, or remind later' : ', or pause'}.
            {weekendPrompt.weekday === 7
              ? ' On Sunday please choose now — remind later is not available.'
              : ''}
          </p>
        </div>
        {showClose && weekendPrompt.canRemindLater ? (
          <button
            type="button"
            aria-label="Remind later"
            disabled={loading !== null}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            onClick={() => void handleRemindLater()}
          >
            {loading === 'remind' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {weekendPrompt.canCreate ? (
          <button
            type="button"
            onClick={() => router.push('/create-plan?weekTarget=next')}
            className="rounded-xl border border-border bg-surface p-3.5 text-left transition-colors hover:bg-accent/40"
          >
            <span className="inline-flex rounded-xl bg-primary-soft p-2 text-primary">
              <PlusCircle className="h-4 w-4" />
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">Create plan</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Pick activities for next week</p>
          </button>
        ) : null}

        {weekendPrompt.canRepeat ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handleRepeat()}
            className="rounded-xl border border-border bg-surface p-3.5 text-left transition-colors hover:bg-accent/40 disabled:opacity-50"
          >
            <span className="inline-flex rounded-xl bg-secondary p-2 text-foreground">
              {loading === 'repeat' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">Copy last week</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Repeat (80%+ unlock)</p>
          </button>
        ) : null}

        {weekendPrompt.canPause ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handlePause()}
            className="rounded-xl border border-border bg-surface p-3.5 text-left transition-colors hover:bg-accent/40 disabled:opacity-50"
          >
            <span className="inline-flex rounded-xl bg-amber-100 p-2 text-amber-800">
              {loading === 'pause' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PauseCircle className="h-4 w-4" />
              )}
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">Pause next week</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Skip planning for next week</p>
          </button>
        ) : null}

        {weekendPrompt.canRemindLater ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handleRemindLater()}
            className="rounded-xl border border-border bg-surface p-3.5 text-left transition-colors hover:bg-accent/40 disabled:opacity-50"
          >
            <span className="inline-flex rounded-xl bg-secondary p-2 text-foreground">
              {loading === 'remind' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">Remind later</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Ask again before Monday</p>
          </button>
        ) : null}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 sm:w-auto"
        onClick={() => router.push('/create-plan?weekTarget=next')}
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        Open plan creator
      </Button>
    </div>
  );
}
