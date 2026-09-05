'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Users, User, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { HappyIcon } from '@/components/ui/HappyIcon';

/**
 * Social → Feed (not profile)
 * Happiness → Home + Tasks
 * Club → Community hub
 * Profile → own feed profile (/feed/profile/:id); Settings linked from there
 */
const baseNavigation = [
  {
    name: 'Social',
    href: '/feed',
    icon: Sparkles,
    match: (pathname: string) =>
      (pathname === '/feed' || pathname.startsWith('/feed/')) &&
      !pathname.startsWith('/feed/profile/'),
  },
  {
    name: 'Happiness',
    href: '/home',
    icon: 'happy' as const,
    match: (pathname: string) =>
      pathname === '/home' ||
      pathname.startsWith('/home/') ||
      pathname === '/tasks' ||
      pathname.startsWith('/tasks/') ||
      pathname === '/mood' ||
      pathname.startsWith('/mood/'),
  },
  {
    name: 'Club',
    href: '/community',
    icon: Users,
    match: (pathname: string) =>
      pathname === '/community' || pathname.startsWith('/community/'),
  },
  {
    name: 'Profile',
    href: '/settings',
    icon: User,
    isProfile: true,
    match: (pathname: string, profilePath: string | null) => {
      if (profilePath && (pathname === profilePath || pathname.startsWith(`${profilePath}/`))) {
        return true;
      }
      return (
        pathname === '/settings' ||
        pathname.startsWith('/settings/') ||
        pathname === '/referral' ||
        pathname.startsWith('/referral/')
      );
    },
  },
] as const;

function NavGlyph({
  icon,
  isActive,
}: {
  icon: LucideIcon | 'happy';
  isActive: boolean;
}) {
  if (icon === 'happy') {
    return (
      <HappyIcon
        className="h-5 w-5"
        filled={isActive}
        strokeWidth={isActive ? 2.5 : 2}
      />
    );
  }
  const Icon = icon;
  return <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />;
}

export default function BottomNav() {
  const pathname = usePathname();
  const selectedProfile = useAuthStore((s) => s.selectedProfile);
  const profilePath = selectedProfile?._id
    ? `/feed/profile/${selectedProfile._id}`
    : null;

  return (
    <nav className="bottom-nav glass-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border">
      <div className="mx-auto max-w-lg px-1.5 sm:max-w-3xl sm:px-2 lg:max-w-4xl">
        <div className="flex h-[4.25rem] items-center justify-around">
          {baseNavigation.map((item) => {
            const href =
              item.name === 'Profile' && profilePath ? profilePath : item.href;
            const isActive = item.match(pathname, profilePath);
            const showAvatar = 'isProfile' in item && item.isProfile;

            return (
              <Link
                key={item.name}
                href={href}
                className={cn(
                  'relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                {showAvatar ? (
                  <ProfileAvatar
                    name={selectedProfile?.name}
                    avatarUrl={selectedProfile?.avatarUrl}
                    avatarSeed={selectedProfile?.avatarSeed}
                    avatarStyle={selectedProfile?.avatarStyle}
                    size="sm"
                    className={cn(
                      '!h-6 !w-6 !text-[10px] ring-2 ring-offset-1 ring-offset-background transition',
                      isActive ? 'ring-primary' : 'ring-transparent'
                    )}
                  />
                ) : (
                  <NavGlyph icon={item.icon} isActive={isActive} />
                )}
                <span className="text-[10px] font-semibold sm:text-xs">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
