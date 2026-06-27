'use client';

import Link from 'next/link';
import { ChevronRight, Flame, ListChecks, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WeekTip {
  id: string;
  title: string;
  detail: string;
  action?: { label: string; href: string };
  tone: 'warm' | 'neutral' | 'success';
}

const toneIcon = {
  warm: Flame,
  neutral: ListChecks,
  success: Trophy,
};

const toneStyles = {
  warm: 'text-primary bg-primary-soft',
  neutral: 'text-foreground bg-secondary',
  success: 'text-success bg-success-soft',
};

interface WeekTipsProps {
  tips: WeekTip[];
}

export function WeekTips({ tips }: WeekTipsProps) {
  if (tips.length === 0) return null;

  return (
    <section aria-label="Weekly notes">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">This week</h2>
        <span className="text-xs text-muted-foreground">{tips.length} note{tips.length === 1 ? '' : 's'}</span>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
        {tips.map((tip, index) => {
          const Icon = toneIcon[tip.tone];
          const content = (
            <>
              <span
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  toneStyles[tip.tone]
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{tip.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{tip.detail}</p>
                {tip.action && (
                  <span className="mt-2 inline-flex items-center gap-0.5 text-sm font-semibold text-primary">
                    {tip.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </>
          );

          return (
            <li
              key={tip.id}
              className={cn(
                'flex gap-3 p-4',
                index > 0 && 'border-t border-border'
              )}
            >
              {tip.action ? (
                <Link href={tip.action.href} className="flex flex-1 gap-3">
                  {content}
                </Link>
              ) : (
                <div className="flex flex-1 gap-3">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function buildWeekTips(input: {
  streak: number;
  todayLogged: boolean;
  daysLoggedThisWeek: number;
  weekPoints: number;
  pendingDailyCount: number;
  hasPlan: boolean;
}): WeekTip[] {
  const tips: WeekTip[] = [];

  if (!input.hasPlan) {
    tips.push({
      id: 'plan',
      title: 'Set up your weekly plan',
      detail: 'Pick activities for the week so tasks and points show up here.',
      action: { label: 'Create plan', href: '/create-plan' },
      tone: 'neutral',
    });
    return tips;
  }

  if (input.streak > 0 && !input.todayLogged) {
    tips.push({
      id: 'streak',
      title: `${input.streak}-day streak on the line`,
      detail: 'Log something today to keep it going.',
      action: { label: 'Open tasks', href: '/tasks' },
      tone: 'warm',
    });
  }

  if (input.pendingDailyCount > 0) {
    tips.push({
      id: 'pending',
      title: `${input.pendingDailyCount} daily ${input.pendingDailyCount === 1 ? 'entry' : 'entries'} left`,
      detail: 'Today\'s activities are still open.',
      action: { label: 'Complete tasks', href: '/tasks' },
      tone: 'neutral',
    });
  }

  if (input.daysLoggedThisWeek >= 4 && input.weekPoints > 0) {
    tips.push({
      id: 'progress',
      title: `${Math.round(input.weekPoints)} pts · ${input.daysLoggedThisWeek}/7 days`,
      detail: 'You\'re logging regularly this week.',
      tone: 'success',
    });
  } else if (input.daysLoggedThisWeek === 0 && input.hasPlan) {
    tips.push({
      id: 'start',
      title: 'Week just started',
      detail: 'Your first log sets the tone — even a small entry counts.',
      action: { label: 'Log today', href: '/tasks' },
      tone: 'neutral',
    });
  }

  if (tips.length === 0 && input.hasPlan) {
    tips.push({
      id: 'calendar',
      title: `${input.daysLoggedThisWeek} of 7 days logged`,
      detail: input.todayLogged
        ? 'You\'re done for today. Check back tomorrow.'
        : 'Open tasks when you\'re ready to log.',
      action: input.todayLogged ? undefined : { label: 'Open tasks', href: '/tasks' },
      tone: 'neutral',
    });
  }

  return tips.slice(0, 2);
}
