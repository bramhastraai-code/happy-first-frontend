'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';

/** Compact field used on login / signup / forgot password. */
export const authFieldClass =
  'h-11 rounded-xl border border-white/70 bg-white/90 px-3 text-sm shadow-sm placeholder:text-neutral-400 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20';

export const authButtonClass =
  'mt-2 !h-11 w-full !rounded-xl text-sm font-semibold shadow-md';

export function AuthOrDivider() {
  return (
    <div className="my-4 flex items-center gap-4">
      <span className="h-px flex-1 bg-white/50" />
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">or</span>
      <span className="h-px flex-1 bg-white/50" />
    </div>
  );
}

interface AuthShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  size?: 'default' | 'wide';
  headerExtra?: ReactNode;
  hideLogo?: boolean;
  icon?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export default function AuthShell({
  children,
  title,
  subtitle,
  footer,
  size = 'default',
  headerExtra,
  hideLogo = false,
  icon,
  backHref,
  backLabel = 'Back',
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#fff8f1]">
        <div className="absolute left-1/4 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
      </div>

      <div className={cn('relative w-full', size === 'wide' ? 'max-w-[440px]' : 'max-w-[380px]')}>
        {backHref ? (
          <a
            href={backHref}
            className="mb-3 inline-flex items-center text-sm font-semibold text-neutral-600 transition hover:text-foreground"
          >
            ← {backLabel}
          </a>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={cn(
            'overflow-hidden rounded-[1.75rem] border border-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-7',
            'bg-white/75'
          )}
        >
          {hideLogo ? null : (
            <div className="mb-5 flex justify-center">
              <BrandLogo href="/" wordmark className="no-underline" />
            </div>
          )}

          {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}

          {title || subtitle ? (
            <div className="mb-5 text-center">
              {title ? (
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-[1.35rem]">
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{subtitle}</p>
              ) : null}
            </div>
          ) : null}

          {headerExtra}

          {children}

          {footer ? (
            <p className="mt-6 border-t border-neutral-200/80 pt-5 text-center text-sm text-neutral-600">
              {footer}
            </p>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
