'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Rss, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * My Inspiration → Feed (social)
 * My Happiness → Home (+ Tasks stays under Happiness)
 * My Community → Community
 * My Profile → Settings (Referrals live inside Profile)
 */
const navigation = [
  {
    name: 'Inspiration',
    href: '/feed',
    icon: Rss,
    match: (pathname: string) =>
      pathname === '/feed' || pathname.startsWith('/feed/'),
  },
  {
    name: 'Happiness',
    href: '/home',
    icon: Home,
    match: (pathname: string) =>
      pathname === '/home' ||
      pathname.startsWith('/home/') ||
      pathname === '/tasks' ||
      pathname.startsWith('/tasks/'),
  },
  {
    name: 'Community',
    href: '/community',
    icon: Users,
    match: (pathname: string) =>
      pathname === '/community' || pathname.startsWith('/community/'),
  },
  {
    name: 'Profile',
    href: '/settings',
    icon: User,
    match: (pathname: string) =>
      pathname === '/settings' ||
      pathname.startsWith('/settings/') ||
      pathname === '/referral' ||
      pathname.startsWith('/referral/'),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav glass-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border">
      <div className="mx-auto max-w-lg px-1.5 sm:max-w-3xl sm:px-2 lg:max-w-4xl">
        <div className="flex h-[4.25rem] items-center justify-around">
          {navigation.map((item) => {
            const isActive = item.match(pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
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
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span className="text-[10px] font-semibold sm:text-xs">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
