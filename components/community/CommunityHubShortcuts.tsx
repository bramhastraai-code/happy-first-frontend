'use client';

import {
  CalendarDays,
  HeartHandshake,
  Images,
  Megaphone,
  MessageCircle,
  Users,
  UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type CommunityHubSection =
  | 'members'
  | 'feed'
  | 'announcements'
  | 'chat'
  | 'kudos'
  | 'groups'
  | 'calendar';

const SHORTCUTS: Array<{
  id: CommunityHubSection;
  label: string;
  color: string;
  icon: typeof Users;
}> = [
  { id: 'chat', label: 'chat', color: '#4DB6A8', icon: MessageCircle },
  { id: 'members', label: 'members', color: '#6CBC5A', icon: Users },
  { id: 'feed', label: 'feed', color: '#C6D63C', icon: Images },
  { id: 'announcements', label: 'news', color: '#EA580C', icon: Megaphone },
  { id: 'kudos', label: 'kudos', color: '#E8A838', icon: HeartHandshake },
  { id: 'groups', label: 'groups', color: '#7E9AAB', icon: UsersRound },
  { id: 'calendar', label: 'calendar', color: '#8B7EC8', icon: CalendarDays },
];

interface CommunityHubShortcutsProps {
  onSelect: (id: CommunityHubSection) => void;
  className?: string;
}

export function CommunityHubShortcuts({ onSelect, className }: CommunityHubShortcutsProps) {
  return (
    <div className={cn('px-1', className)}>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
        {SHORTCUTS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm"
                style={{ backgroundColor: item.color }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-[11px] font-medium capitalize text-foreground">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const COMMUNITY_SECTION_TITLES: Record<Exclude<CommunityHubSection, 'chat'>, string> = {
  members: 'Members',
  feed: 'Feed',
  announcements: 'News',
  kudos: 'Kudos',
  groups: 'Groups',
  calendar: 'Calendar',
};
