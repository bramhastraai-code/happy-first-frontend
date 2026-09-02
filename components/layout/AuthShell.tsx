'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';

/** Instagram-style field used on login / signup / forgot password. */
export const authFieldClass =
  'h-[38px] rounded-[3px] border border-[#dbdbdb] bg-[#fafafa] px-2 text-xs text-[#262626] shadow-none placeholder:text-[#737373] focus-visible:border-[#a8a8a8] focus-visible:ring-0 focus-visible:ring-offset-0';

export const authSelectClass =
  'h-[38px] w-full rounded-[3px] border border-[#dbdbdb] bg-[#fafafa] px-2 text-xs text-[#262626] outline-none focus:border-[#a8a8a8]';

export const authButtonClass =
  'mt-2 !h-8 w-full !rounded-lg text-sm font-semibold shadow-none focus-visible:ring-0 active:!scale-100';

export const authLinkClass = 'font-semibold text-primary hover:text-primary/90';

export function AuthOrDivider() {
  return (
    <div className="my-4 flex items-center gap-4">
      <span className="h-px flex-1 bg-[#dbdbdb]" />
      <span className="text-xs font-semibold uppercase tracking-wide text-[#737373]">or</span>
      <span className="h-px flex-1 bg-[#dbdbdb]" />
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
  const cardClass = 'bg-transparent px-2 py-8 sm:px-4 sm:py-10';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      <div className={cn('w-full', size === 'wide' ? 'max-w-[400px]' : 'max-w-[350px]')}>
        {backHref ? (
          <a
            href={backHref}
            className="mb-3 inline-flex items-center text-sm font-semibold text-[#00376b]"
          >
            {backLabel}
          </a>
        ) : null}

        <div className={cardClass}>
          {hideLogo ? null : (
            <div className="mb-6 flex justify-center">
              <BrandLogo href="/" wordmark className="no-underline" />
            </div>
          )}

          {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}

          {title || subtitle ? (
            <div className="mb-5 text-center">
              {title ? (
                <h1 className="text-[17px] font-semibold leading-5 text-[#737373]">{title}</h1>
              ) : null}
              {subtitle ? (
                <p className={cn('text-sm leading-5 text-[#737373]', title && 'mt-2')}>
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}

          {headerExtra}

          {children}
        </div>

        {footer ? (
          <div className={cn(cardClass, 'mt-2.5 py-[18px] text-center text-sm text-[#262626] sm:py-[18px]')}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
