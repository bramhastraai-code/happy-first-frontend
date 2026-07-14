import {
  BarChart3,
  Calendar,
  Camera,
  ClipboardList,
  History,
  LayoutGrid,
  PlusCircle,
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
      href: '/activity-photos',
      label: 'Activity photos',
      description: 'Community photo gallery',
      icon: Camera,
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
      href: '/community',
      label: 'Community',
      description: 'Discover wellness groups',
      icon: Users,
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
