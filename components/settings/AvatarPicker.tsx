'use client';

import { Dices, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AVATAR_STYLE,
  buildDiceBearAvatarUrl,
  randomAvatarSeed,
} from '@/lib/utils/avatar';
import { cn } from '@/lib/utils';

interface AvatarPickerProps {
  name: string;
  seed: string;
  onSeedChange: (seed: string) => void;
  className?: string;
}

const SUGGESTED_SEEDS = ['happy', 'explorer', 'sunny', 'brave', 'calm', 'spark'];

export function AvatarPicker({ name, seed, onSeedChange, className }: AvatarPickerProps) {
  const activeSeed = seed.trim() || name.trim() || 'happy-first';
  const previewUrl = buildDiceBearAvatarUrl(activeSeed, AVATAR_STYLE, 160);

  return (
    <div className={cn('rounded-2xl border border-border bg-secondary/40 p-4', className)}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Avatar preview"
            className="h-24 w-24 rounded-2xl border border-border bg-surface object-cover shadow-sm"
          />
          <p className="text-[11px] font-medium text-muted-foreground">Adventurer</p>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Avatar seed
            </label>
            <Input
              value={seed}
              onChange={(e) => onSeedChange(e.target.value)}
              placeholder={name.trim() || 'Type a word for your avatar'}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Powered by DiceBear Adventurer. Same seed always gives the same look.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onSeedChange(randomAvatarSeed())}
            >
              <Dices className="h-3.5 w-3.5" />
              Random
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onSeedChange(name.trim() || 'happy-first')}
              disabled={!name.trim()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Use my name
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SEEDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSeedChange(item)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors',
                  seed === item
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
