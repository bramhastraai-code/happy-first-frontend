import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Instagram-style square field used on Settings forms. */
export const settingsFieldClass =
  'h-10 w-full rounded-none border border-[#dbdbdb] bg-[#fafafa] px-2.5 text-sm shadow-none placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-0';

export const settingsTextareaClass =
  'w-full rounded-none border border-[#dbdbdb] bg-[#fafafa] px-2.5 py-2 text-sm shadow-none outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-0';

export const settingsBtnClass = '!rounded-none';

export function SettingsGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[13px] font-semibold text-neutral-500">{label}</h2>
      <div className="divide-y divide-[#efefef] overflow-hidden rounded-none border border-[#dbdbdb] bg-white">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  href,
  onClick,
  danger = false,
  trailing,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <Icon
        className={cn('h-6 w-6 shrink-0', danger ? 'text-destructive' : 'text-foreground')}
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm',
            danger ? 'font-medium text-destructive' : 'text-foreground'
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs text-neutral-400">{subtitle}</span>
        ) : null}
      </span>
      {trailing ?? (
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
      )}
    </>
  );

  const className =
    'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50';

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
