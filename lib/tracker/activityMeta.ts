import { Bike, Footprints, MapPin, Mountain, PersonStanding, type LucideIcon } from 'lucide-react';
import type { ActivityType } from '@/lib/tracker/types';

export const ACTIVITY_META: Record<
  ActivityType,
  { label: string; icon: LucideIcon; softClass: string; iconClass: string }
> = {
  run: {
    label: 'Run',
    icon: Footprints,
    softClass: 'bg-orange-100 text-orange-700',
    iconClass: 'text-orange-600',
  },
  walk: {
    label: 'Walk',
    icon: PersonStanding,
    softClass: 'bg-emerald-100 text-emerald-700',
    iconClass: 'text-emerald-600',
  },
  cycle: {
    label: 'Cycle',
    icon: Bike,
    softClass: 'bg-sky-100 text-sky-700',
    iconClass: 'text-sky-600',
  },
  hike: {
    label: 'Hike',
    icon: Mountain,
    softClass: 'bg-amber-100 text-amber-800',
    iconClass: 'text-amber-700',
  },
  other: {
    label: 'Other',
    icon: MapPin,
    softClass: 'bg-violet-100 text-violet-700',
    iconClass: 'text-violet-600',
  },
};

export const ACTIVITY_TYPES = (Object.keys(ACTIVITY_META) as ActivityType[]).map((id) => ({
  id,
  ...ACTIVITY_META[id],
}));
