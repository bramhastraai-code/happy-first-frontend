'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Lock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PlanStepProgress({ step }: { step: 'choice' | 'select' | 'configure' }) {
  const steps = ['choice', 'select', 'configure'] as const;
  const current = steps.indexOf(step);

  return (
    <div className="flex items-center gap-2">
      {steps.map((name, index) => (
        <div
          key={name}
          className={cn('h-1.5 flex-1 rounded-full transition-colors', index <= current ? 'bg-primary' : 'bg-secondary')}
        />
      ))}
    </div>
  );
}

export function PlanStatusScreen({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
  actions,
}: {
  icon: typeof Lock;
  iconClassName?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="app-card w-full max-w-md p-6 text-center">
        <div className={cn('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary', iconClassName)}>
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {children && <div className="mt-4 text-left">{children}</div>}
        {actions && <div className="mt-6 space-y-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PlanUnlockInfo({ currentDay }: { currentDay: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary p-4 text-center">
      <Calendar className="mx-auto mb-2 h-5 w-5 text-primary" />
      <p className="text-sm font-semibold text-foreground">Available days</p>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {['Fri', 'Sat', 'Sun', 'Mon'].map((day) => (
          <span key={day} className="chip chip-active px-2.5 py-1 text-[11px]">
            {day}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Today is <span className="font-semibold text-foreground">{currentDay}</span>
      </p>
    </div>
  );
}

export function ActivityPickCard({
  icon,
  name,
  unit,
  selected,
  mandatory,
  onClick,
}: {
  icon: string;
  name: string;
  unit: string;
  selected: boolean;
  mandatory?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'section-card flex w-full items-center gap-3 p-4 text-left transition-colors',
        selected && (mandatory ? 'ring-2 ring-success/40 bg-success-soft/30' : 'ring-2 ring-primary/30 bg-primary-soft/40')
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {mandatory && (
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">
              Required
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </div>
      {selected && <CheckCircle2 className={cn('h-5 w-5 shrink-0', mandatory ? 'text-success' : 'text-primary')} />}
    </button>
  );
}

export function ConfigureActivityCard({
  icon,
  name,
  unit,
  cadence,
  targetValue,
  mandatory,
}: {
  icon: string;
  name: string;
  unit: string;
  cadence: string;
  targetValue: number;
  mandatory?: boolean;
}) {
  return (
    <div className={cn('section-card p-4', mandatory && 'bg-success-soft/20')}>
      <div className="mb-3 flex items-start gap-3 border-b border-border pb-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
            {mandatory && (
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                Required
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Unit: {unit}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-secondary p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Cadence</p>
          <p className="mt-1 text-lg font-bold capitalize text-foreground">{cadence}</p>
        </div>
        <div className="rounded-xl border border-border bg-secondary p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Target</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {targetValue} <span className="text-sm font-medium text-muted-foreground">{unit}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
