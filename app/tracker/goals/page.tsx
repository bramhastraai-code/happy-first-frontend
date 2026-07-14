'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import GoalProgress from '@/components/tracker/GoalProgress';
import TrackerHeader from '@/components/tracker/TrackerHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGoals } from '@/lib/tracker/hooks/useActivity';
import { cn } from '@/lib/utils';

export default function TrackerGoalsPage() {
  const { data: goals, createGoal, deleteGoal } = useGoals();
  const [type, setType] = useState<'distance' | 'duration' | 'calories' | 'sessions'>('distance');
  const [target, setTarget] = useState('10');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const handleCreate = async () => {
    await createGoal.mutateAsync({
      type,
      target: Number(target),
      period,
      activityType: null,
      active: true,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-5 py-4 sm:space-y-6 sm:py-6">
        <TrackerHeader title="Fitness goals" subtitle="Set weekly or monthly targets" />

        <GoalProgress goals={goals ?? []} />

        <section className="section-card space-y-4 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-foreground">Create a goal</h2>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goal type</span>
              <select
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="distance">Distance (km)</option>
                <option value="duration">Duration (min)</option>
                <option value="calories">Calories</option>
                <option value="sessions">Sessions</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</span>
              <div className="grid grid-cols-2 gap-2">
                {(['weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      'h-11 rounded-xl border text-sm font-semibold capitalize transition-colors',
                      period === p
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-border bg-surface text-muted-foreground'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target</span>
              <Input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Enter target"
                className="h-11 rounded-xl"
              />
            </label>
          </div>
          <Button
            onClick={handleCreate}
            disabled={createGoal.isPending || !target}
            className="h-11 w-full rounded-xl"
          >
            {createGoal.isPending ? 'Adding…' : 'Add goal'}
          </Button>
        </section>

        {goals && goals.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-foreground">All goals</h2>
            {goals.map((g) => (
              <div
                key={g._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {g.period} {g.type}
                  </p>
                  <p className="text-xs text-muted-foreground">Target: {g.target}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => deleteGoal.mutate(g._id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </section>
        )}
      </div>
    </MainLayout>
  );
}
