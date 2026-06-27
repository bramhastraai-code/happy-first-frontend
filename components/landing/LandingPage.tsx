'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BellRing, CalendarCheck, ClipboardList, UsersRound, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { cn } from '@/lib/utils';
import { BRAND_NAME } from '@/lib/brand';

const Threads = dynamic(() => import('@/components/backgrounds/Threads'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0c0a09]" aria-hidden />,
});

const ORANGE_THREADS: [number, number, number] = [0.918, 0.345, 0.047];

const features: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  iconClass: string;
  ringClass: string;
}> = [
  {
    icon: CalendarCheck,
    title: 'Daily habit tracking',
    description: 'Log activities, build streaks, and see your progress at a glance.',
    iconClass: 'bg-gradient-to-br from-primary to-orange-600 text-white shadow-[0_8px_20px_rgb(234_88_12_/_0.35)]',
    ringClass: 'ring-primary/20',
  },
  {
    icon: ClipboardList,
    title: 'Personal weekly plans',
    description: 'Structured plans shaped around your goals, routine, and wellness priorities.',
    iconClass: 'bg-gradient-to-br from-stone-800 to-stone-950 text-white shadow-[0_8px_20px_rgb(28_25_23_/_0.25)]',
    ringClass: 'ring-stone-300/60',
  },
  {
    icon: BellRing,
    title: 'WhatsApp reminders',
    description: 'Gentle nudges on your schedule so consistency feels effortless.',
    iconClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_8px_20px_rgb(16_185_129_/_0.3)]',
    ringClass: 'ring-emerald-200/80',
  },
  {
    icon: UsersRound,
    title: 'Community & family',
    description: 'Grow together with referrals, leaderboards, and family profiles.',
    iconClass: 'bg-gradient-to-br from-amber-500 to-primary text-white shadow-[0_8px_20px_rgb(245_158_11_/_0.35)]',
    ringClass: 'ring-amber-200/80',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0c0a09] text-white">
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="absolute inset-0">
          <Threads
            amplitude={1}
            distance={0}
            enableMouseInteraction
            color={ORANGE_THREADS}
            className="h-full w-full"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0c0a09]/30 via-[#0c0a09]/55 to-[#0c0a09]"
          aria-hidden
        />

        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
          <BrandLogo href="/" variant="light" size="md" className="shadow-none" />

          <nav className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" className="text-white/90 hover:bg-white/10 hover:text-white">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="shadow-[var(--shadow-float)]">
              <Link href="/register">Sign up</Link>
            </Button>
          </nav>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-6 sm:px-8">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
              Build your{' '}
              <span className="bg-gradient-to-r from-orange-300 to-primary bg-clip-text text-transparent">
                Wellth
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone-300 sm:text-lg">
              Track habits, follow personalized weekly plans, and stay consistent with your community —
              all in one calm, focused app.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 min-w-[180px] text-base shadow-[var(--shadow-float)]">
                <Link href="/register">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 min-w-[180px] border-white/25 bg-white/5 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 flex justify-center pb-8">
          <a
            href="#features"
            className="text-xs font-medium uppercase tracking-widest text-stone-400 transition-colors hover:text-orange-200"
          >
            Explore features
          </a>
        </div>
      </section>

      <section id="features" className="relative bg-background px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything you need to stay on track
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {BRAND_NAME} combines daily logging, smart planning, and gentle accountability —
              designed for real life, not perfection.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description, iconClass, ringClass }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                className={cn(
                  'group section-card overflow-hidden p-5 transition-shadow hover:shadow-[var(--shadow-float)] sm:p-6',
                  'ring-1 ring-inset',
                  ringClass
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105',
                      iconClass
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground/50">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface px-5 py-8 text-center sm:px-8">
        <BrandLogo href="/" size="sm" className="justify-center" />
        <p className="mt-3 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND_NAME}. Build your Wellth, one day at a time.
        </p>
      </footer>
    </div>
  );
}
