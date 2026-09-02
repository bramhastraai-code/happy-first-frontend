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
  id: Exclude<CommunityHubSection, 'chat'>;
  label: string;
  color: string;
  icon: typeof Users;
}> = [
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
    <div className={cn('space-y-3', className)}>
      <button
        type="button"
        onClick={() => onSelect('chat')}
        className="flex w-full items-center gap-3 rounded-[1.5rem] border border-border bg-surface px-4 py-3.5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/40"
      >
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: '#4DB6A8' }}
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg font-semibold leading-tight text-foreground">
            Community chat
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Tap to talk with members
          </span>
        </span>
      </button>

      <section className="rounded-[1.5rem] border border-border bg-surface px-3 py-4 shadow-[var(--shadow-card)]">
        <p className="mb-3 px-1 font-serif text-lg font-semibold leading-tight text-foreground">
          What do you want to do?
        </p>
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6">
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
                <span className="text-[11px] font-medium capitalize text-foreground">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
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
