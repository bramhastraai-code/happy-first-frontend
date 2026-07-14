'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

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
