'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  COMMUNITY_ACTIVITY_LEVEL_OPTIONS,
  type CommunityActivityLevel,
} from '@/lib/api/community';
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
};

interface CommunityCustomActivityFormProps {
  /** When set, submits immediately via onCreate. Otherwise adds a local draft via onDraft. */
  mode?: 'draft' | 'create';
  onDraft?: (draft: CustomActivityDraft) => void;
  onCreate?: (draft: Omit<CustomActivityDraft, 'localId'>) => Promise<void>;
  className?: string;
}

const UNIT_PRESETS = ['days', 'mins', 'steps', 'km', 'sessions', 'hrs'];

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
  const [defaultTarget, setDefaultTarget] = useState('');

  const reset = () => {
    setName('');
    setBaseUnit('days');
    setDescription('');
    setCategory('body');
    setIcon('✨');
    setCadence('weekly');
    setLevel('active');
    setDefaultTarget('');
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
    const payload = {
      name: trimmed,
      baseUnit: baseUnit.trim(),
      description: description.trim(),
      category,
      icon: icon.trim() || '✨',
      allowedCadence: [cadence] as Array<'daily' | 'weekly'>,
      level,
      defaultTarget,
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
          Custom activity for this community only — pick a unit and weekly level
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
          <input
            value={baseUnit}
            onChange={(e) => setBaseUnit(e.target.value)}
            list="community-custom-units"
            placeholder="days"
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="community-custom-units">
            {UNIT_PRESETS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
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

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-muted-foreground">
          Weekly target (optional)
        </span>
        <input
          value={defaultTarget}
          onChange={(e) => setDefaultTarget(e.target.value.replace(/[^\d.]/g, ''))}
          inputMode="decimal"
          placeholder="Auto from level if blank"
          className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

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
