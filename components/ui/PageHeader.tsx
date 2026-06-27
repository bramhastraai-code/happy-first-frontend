'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn('mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4', className)}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        )}
      </div>
      {action}
    </motion.header>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: string;
  accent?: 'orange' | 'green' | 'neutral';
}

const accentStyles = {
  orange: 'bg-primary-soft text-primary',
  green: 'bg-success-soft text-success',
  neutral: 'bg-secondary text-secondary-foreground',
};

export function StatCard({ label, value, hint, icon: Icon, trend, accent = 'orange' }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="h-full rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-card)] sm:p-4"
    >
      <div className="flex h-full items-center gap-2.5 sm:gap-3">
        <span className={cn('inline-flex shrink-0 rounded-xl p-2 sm:p-2.5', accentStyles[accent])}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
        </span>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight tracking-tight sm:hidden">{value}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-foreground sm:mt-0 sm:text-sm">
              {label}
            </p>
            {hint && (
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:mt-1 sm:text-xs">
                {hint}
              </p>
            )}
            {trend && (
              <span className="mt-1 hidden rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success sm:inline">
                {trend}
              </span>
            )}
          </div>

          <p className="hidden shrink-0 text-right text-2xl font-bold leading-none tracking-tight tabular-nums sm:block lg:text-[1.75rem]">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface StreakDay {
  label: string;
  completed: boolean;
}

export function StreakCard({ streak, days }: { streak: number; days: StreakDay[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex rounded-2xl bg-primary-soft p-3 text-primary">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden>
            <path d="M12 2c1.5 3 4 4.5 4 8a4 4 0 1 1-8 0c0-3.5 2.5-5 4-8Zm0 18a6 6 0 0 0 6-6H6a6 6 0 0 0 6 6Z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Current streak</p>
          <p className="text-2xl font-bold">{streak} day{streak === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="flex justify-between gap-1">
        {days.map((day) => (
          <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold',
                day.completed
                  ? 'bg-success text-white'
                  : 'border border-border bg-secondary text-muted-foreground'
              )}
            >
              {day.completed ? '✓' : '·'}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
