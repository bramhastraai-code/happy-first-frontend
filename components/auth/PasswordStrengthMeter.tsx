'use client';

import { cn } from '@/lib/utils';
import type { PasswordStrength } from '@/components/auth/registerValidation';

const STRENGTH_META: Record<
  Exclude<PasswordStrength, 'empty'>,
  { label: string; bars: number; color: string; text: string }
> = {
  weak: { label: 'Weak', bars: 1, color: 'bg-destructive', text: 'text-destructive' },
  fair: { label: 'Fair', bars: 2, color: 'bg-amber-500', text: 'text-amber-700' },
  strong: { label: 'Strong', bars: 3, color: 'bg-success', text: 'text-success' },
};

interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
}

export function PasswordStrengthMeter({ strength }: PasswordStrengthMeterProps) {
  if (strength === 'empty') return null;

  const meta = STRENGTH_META[strength];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className={cn(
              'h-1 flex-1 rounded-full bg-border transition-colors',
              bar <= meta.bars && meta.color
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', meta.text)}>{meta.label} password</p>
    </div>
  );
}
