'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Share2, PlusCircle, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Home', href: '/home', icon: Home },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Plan', href: '/create-plan', icon: PlusCircle },
  { name: 'Refer', href: '/referral', icon: Share2 },
  { name: 'Community', href: '/community', icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { accessToken } = useAuthStore();
  const [editPlanHref, setEditPlanHref] = useState('/create-plan');

  useEffect(() => {
    const resolvePlanHref = async () => {
      if (!accessToken) return;
      try {
        const upcoming = await weeklyPlanAPI.getUpcomingPlan();
        if (upcoming?._id) {
          setEditPlanHref(`/create-plan?edit=${upcoming._id}`);
          return;
        }
        const current = await weeklyPlanAPI.getCurrentPlan();
        if (
          current?._id &&
          (current.status === 'carried-forward' || current.status === 'active')
        ) {
          setEditPlanHref(`/create-plan?edit=${current._id}`);
          return;
        }
        setEditPlanHref('/create-plan');
      } catch {
        setEditPlanHref('/create-plan');
      }
    };
    resolvePlanHref();
  }, [accessToken, pathname]);

  return (
    <nav className="bottom-nav glass-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border">
      <div className="mx-auto max-w-lg px-2 sm:max-w-2xl lg:max-w-5xl">
        <div className="flex h-[4.25rem] items-center justify-around">
          {navigation.map((item) => {
            const isCreatePlan = item.href === '/create-plan';
            const href = isCreatePlan ? editPlanHref : item.href;
            const isEditing = isCreatePlan && editPlanHref.includes('edit=');
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (isCreatePlan && pathname.startsWith('/create-plan'));
            const Icon = isEditing ? Pencil : item.icon;

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
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span className="text-xs font-semibold">{isEditing ? 'Edit' : item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
