'use client';

import Link from 'next/link';
import { Plus, Rss, ScanLine } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import {
  AppPageHeader,
  headerActionBtnClass,
} from '@/components/ui/AppPageHeader';
import { firstNameFrom } from '@/lib/utils/greeting';
import { cn } from '@/lib/utils';

interface CommunityTopBarProps {
  className?: string;
  onOpenScanner?: () => void;
}

export function CommunityTopBar({ className, onOpenScanner }: CommunityTopBarProps) {
  const { selectedProfile, user } = useAuthStore();
  const displayName = selectedProfile?.name || user?.name || 'there';

  const profileHref = selectedProfile?._id
    ? `/feed/profile/${selectedProfile._id}`
    : null;

  return (
    <AppPageHeader
      className={cn(className)}
      title={<span className="text-primary">{firstNameFrom(displayName)}</span>}
      subtitle={new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })}
      subtitleTone="label"
      avatarHref={profileHref}
      actions={
        <>
          {onOpenScanner ? (
            <button
              type="button"
              onClick={onOpenScanner}
              className={headerActionBtnClass}
              aria-label="Scan community QR"
              title="Scan QR"
            >
              <ScanLine className="h-[18px] w-[18px]" />
            </button>
          ) : null}
          <Link
            href="/feed"
            className={headerActionBtnClass}
            aria-label="Open Feed"
            title="Open Feed"
          >
            <Rss className="h-[18px] w-[18px]" />
          </Link>
          <Link
            href="/community/create"
            className={headerActionBtnClass}
            aria-label="Create community"
            title="Create"
          >
            <Plus className="h-[18px] w-[18px]" />
          </Link>
        </>
      }
    />
  );
}
