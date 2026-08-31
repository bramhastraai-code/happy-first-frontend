'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';

/** Compact field used on login / signup / forgot password. */
export const authFieldClass =
  'h-10 rounded-none border-[#e7e5e4] bg-white px-2.5 text-xs shadow-none placeholder:text-[12px] placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-0';

export const authButtonClass =
  'mt-1 !h-8 w-full !rounded-lg text-[14px] font-semibold shadow-none';

export function AuthOrDivider() {
  return (
    <div className="my-4 flex items-center gap-4">
      <span className="h-px flex-1 bg-[#e7e5e4]" />
      <span className="text-[13px] font-semibold uppercase tracking-wide text-neutral-400">or</span>
      <span className="h-px flex-1 bg-[#e7e5e4]" />
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
}: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-[#fff8f1] px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      <div className={cn('w-full', size === 'wide' ? 'max-w-[420px]' : 'max-w-[350px]')}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="px-2 py-6 sm:px-0"
        >
          {hideLogo ? null : (
            <div className="mb-6 flex justify-center">
              <BrandLogo href="/" wordmark className="no-underline" />
            </div>
          )}

          {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}

          {title || subtitle ? (
            <div className="mb-5 text-center">
              {title ? (
                <h1 className="text-[17px] font-semibold leading-snug text-neutral-500">
                  {title}
                </h1>
              ) : null}
              {subtitle ? (
                <p className="mt-1 text-[13px] leading-snug text-neutral-500">{subtitle}</p>
              ) : null}
            </div>
          ) : null}

          {headerExtra}

          {children}

          {footer ? (
            <p className="mt-8 text-center text-sm text-neutral-600">{footer}</p>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
