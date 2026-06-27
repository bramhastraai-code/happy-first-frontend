'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Share2, PlusCircle, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { weeklyPlanAPI } from '@/lib/api/weeklyPlan';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
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
  const [hasUpcomingPlan, setHasUpcomingPlan] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const checkUpcomingPlan = async () => {
      if (!accessToken) return;
      try {
        const plan = await weeklyPlanAPI.getUpcomingPlan();
        setHasUpcomingPlan(Boolean(plan));
      } catch {
        setHasUpcomingPlan(false);
      }
    };
    checkUpcomingPlan();
  }, [accessToken, pathname]);

  return (
    <>
      <nav className="bottom-nav glass-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border">
        <div className="mx-auto max-w-lg px-2 sm:max-w-2xl lg:max-w-5xl">
          <div className="flex h-[4.25rem] items-center justify-around">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const isCreatePlan = item.href === '/create-plan';
              const isLocked = isCreatePlan && hasUpcomingPlan;

              if (isLocked) {
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setShowMessage(true)}
                    className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground"
                  >
                    <Lock className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">{item.name}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
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
                  <span className="text-[10px] font-semibold">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {showMessage && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/40 p-4 sm:items-center"
          onClick={() => setShowMessage(false)}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-[var(--shadow-float)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-center text-lg font-bold">Plan already created</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              You already have an upcoming plan. Create a new one after it starts.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => {
                setShowMessage(false);
                window.location.href = '/upcoming';
              }}
            >
              View upcoming plan
            </Button>
          </motion.div>
        </div>
      )}
    </>
  );
}
