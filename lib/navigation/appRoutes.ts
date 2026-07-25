import {
  BarChart3,
  Calendar,
  ClipboardList,
  History,
  LayoutGrid,
  PlusCircle,
  Rss,
  Settings,
  Share2,
  Sparkles,
  Users,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { DateTime } from 'luxon';

export interface AppQuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export function getAppQuickLinks(): AppQuickLink[] {
  const weekStart = DateTime.local().startOf('week').toFormat('yyyy-MM-dd');

  return [
    {
      href: '/home',
      label: 'Dashboard',
      description: 'Overview, charts, and weekly tracker',
      icon: LayoutGrid,
    },
    {
      href: '/tasks',
      label: 'Tasks',
      description: 'Log today’s activities',
      icon: ClipboardList,
    },
    {
      href: '/feed',
      label: 'Feed',
      description: 'Social stories, photos, videos, and messages',
      icon: Rss,
    },
    {
      href: '/community',
      label: 'Community',
      description: 'Create groups, chat, and track points together',
      icon: Users,
    },
    {
      href: '/streak-calendar',
      label: 'Streak calendar',
      description: 'Monthly log heatmap',
      icon: Calendar,
    },
    {
      href: `/week-analysis?weekStart=${weekStart}`,
      label: 'Week analysis',
      description: 'Points, ranks, and losses',
      icon: BarChart3,
    },
    {
      href: '/previous-log',
      label: 'Previous logs',
      description: 'Backfill missed days',
      icon: History,
    },
    {
      href: '/upcoming',
      label: 'Upcoming plan',
      description: 'Next week’s plan preview',
      icon: Sparkles,
    },
    {
      href: '/create-plan',
      label: 'Create plan',
      description: 'Set up a weekly plan',
      icon: PlusCircle,
    },
    {
      href: '/referral',
      label: 'Refer friends',
      description: 'Share and earn points',
      icon: Share2,
    },
    {
      href: '/tracker',
      label: 'Fitness tracker',
      description: 'GPS workouts, maps, and goals',
      icon: MapPin,
    },
    {
      href: '/settings',
      label: 'Settings',
      description: 'Profile, family, reminders',
      icon: Settings,
    },
  ];
}
