'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  size?: 'default' | 'wide';
  headerExtra?: ReactNode;
}

export default function AuthShell({
  children,
  title,
  subtitle,
  footer,
  size = 'default',
  headerExtra,
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.5rem+env(safe-area-inset-top,0px))] sm:px-6">
      <div
        className={cn(
          'w-full',
          size === 'wide' ? 'max-w-[720px]' : 'max-w-[420px]'
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-5 flex justify-center"
        >
          <BrandLogo href="/" size="md" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
          className="rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-7"
        >
          <div className="mb-5 text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {headerExtra}

          {children}
        </motion.div>

        {footer && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-center text-sm text-muted-foreground"
          >
            {footer}
          </motion.p>
        )}
      </div>
    </div>
  );
}
