'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomDropdown } from '@/components/ui/CustomDropdown';
import {
  COMMUNITY_ACTIVITY_LEVEL_OPTIONS,
  type CommunityActivityLevel,
} from '@/lib/api/community';
import {
  emptyLevelTargets,
  levelTargetsFromUnit,
  parseLevelTargetsPayload,
  type LevelTargetsDraft,
} from '@/lib/community/unitTargetDefaults';
import { cn } from '@/lib/utils';

export type CustomActivityDraft = {
  localId: string;
  name: string;
  baseUnit: string;
  description: string;
  category: 'mind' | 'body' | 'soul';
  icon: string;
  allowedCadence: Array<'daily' | 'weekly'>;
  level: CommunityActivityLevel;
  defaultTarget: string;
  levelTargets: LevelTargetsDraft;
};

interface CommunityCustomActivityFormProps {
  mode?: 'draft' | 'create';
  onDraft?: (draft: CustomActivityDraft) => void;
  onCreate?: (draft: Omit<CustomActivityDraft, 'localId'>) => Promise<void>;
  className?: string;
}

const UNIT_OPTIONS = [
  { value: 'days', label: 'Days (Done / Not Done)' },
  { value: 'mins', label: 'Minutes' },
  { value: 'steps', label: 'Steps' },
  { value: 'km', label: 'Kilometers' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'hrs', label: 'Hours' },
  { value: 'count', label: 'Count' },
];

function isDaysUnit(unit: string) {
  return String(unit || '').trim().toLowerCase() === 'days';
}

export function CommunityCustomActivityForm({
  mode = 'draft',
  onDraft,
  onCreate,
  className,
}: CommunityCustomActivityFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('days');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'mind' | 'body' | 'soul'>('body');
  const [icon, setIcon] = useState('✨');
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('weekly');
  const [level, setLevel] = useState<CommunityActivityLevel>('active');
  const [levelTargets, setLevelTargets] = useState<LevelTargetsDraft>(emptyLevelTargets());

  const daysUnit = isDaysUnit(baseUnit);

  useEffect(() => {
    setLevelTargets(levelTargetsFromUnit(baseUnit));
  }, [baseUnit]);

  const reset = () => {
    setName('');
    setBaseUnit('days');
    setDescription('');
    setCategory('body');
    setIcon('✨');
    setCadence('weekly');
    setLevel('active');
    setLevelTargets(levelTargetsFromUnit('days'));
    setError('');
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (!baseUnit.trim()) {
      setError('Unit is required');
      return;
    }
    const parsedTargets = parseLevelTargetsPayload(levelTargets, baseUnit);
    const payload = {
      name: trimmed,
      baseUnit: baseUnit.trim(),
      description: description.trim(),
      category,
      icon: icon.trim() || '✨',
      allowedCadence: [cadence] as Array<'daily' | 'weekly'>,
      level,
      defaultTarget: daysUnit ? '' : levelTargets[level] || String(parsedTargets[level]),
      levelTargets,
    };
    setSaving(true);
    setError('');
    try {
      if (mode === 'create' && onCreate) {
        await onCreate(payload);
      } else if (onDraft) {
        onDraft({ ...payload, localId: `custom-${Date.now()}` });
      }
      reset();
      setOpen(false);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err as Error)?.message ||
          'Could not add custom activity'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary-soft/30 px-3 py-3 text-sm font-semibold text-primary transition hover:bg-primary-soft/50',
          className
        )}
      >
        <Plus className="h-4 w-4" />
        Create new way to log
      </button>
    );
  }

  return (
    <div className={cn('section-card space-y-3 p-4', className)}>
      <div>
        <p className="text-sm font-semibold text-foreground">New way to log</p>
        <p className="text-xs text-muted-foreground">
          Set weekly targets for each level — pick which level this community starts on
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-muted-foreground">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="e.g. Evening Walk"
          className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Unit</span>
          <CustomDropdown
            value={baseUnit}
            options={UNIT_OPTIONS}
            aria-label="Activity unit"
            onChange={setBaseUnit}
            className="w-full"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Icon</span>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={4}
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      {daysUnit ? (
        <p className="rounded-lg bg-secondary/80 px-3 py-2 text-[11px] text-muted-foreground">
          Weekly <strong>days</strong> activities are logged as <strong>Done</strong> or{' '}
          <strong>Not Done</strong> each day.
        </p>
      ) : null}

      <div className="space-y-2 rounded-xl border border-border bg-secondary/30 p-3">
        <p className="text-[11px] font-semibold text-muted-foreground">
          Weekly targets per level ({baseUnit}/week)
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {COMMUNITY_ACTIVITY_LEVEL_OPTIONS.map((opt) => (
            <label key={opt.value} className="block space-y-1">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                {opt.label}
              </span>
              <input
                value={levelTargets[opt.value]}
                onChange={(e) =>
                  setLevelTargets((prev) => ({
                    ...prev,
                    [opt.value]: e.target.value.replace(/[^\d.]/g, ''),
                  }))
                }
                inputMode="decimal"
                placeholder={String(parseLevelTargetsPayload(emptyLevelTargets(), baseUnit)[opt.value])}
                className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['body', 'mind', 'soul'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize',
              category === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}
          >
            {c}
          </button>
        ))}
        {(['weekly', 'daily'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCadence(c)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize',
              cadence === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Starting level in community</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMUNITY_ACTIVITY_LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLevel(opt.value)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                level === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-muted-foreground">Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={300}
          className="w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={saving}
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="button" className="flex-1" disabled={saving} onClick={() => void submit()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'create' ? 'Create & add' : 'Add to list'}
        </Button>
      </div>
    </div>
  );
}
