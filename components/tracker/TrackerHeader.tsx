'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import {
  AppPageHeader,
  headerActionBtnClass,
} from '@/components/ui/AppPageHeader';
import { cn } from '@/lib/utils';

interface TrackerHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
}

export default function TrackerHeader({
  title,
  subtitle,
  backHref = '/tracker',
  backLabel = 'Back',
  action,
  className,
}: TrackerHeaderProps) {
  return (
    <AppPageHeader
      className={cn(className)}
      title={title}
      subtitle={subtitle}
      subtitleTone="plain"
      showAvatar={false}
      leading={
        <Link
          href={backHref}
          className={headerActionBtnClass}
          aria-label={backLabel}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      }
      actions={action}
    />
  );
}
