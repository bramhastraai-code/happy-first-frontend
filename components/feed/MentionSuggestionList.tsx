'use client';

import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';

export type MentionSuggestionPerson = {
  profileId: string;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  subtitle?: string;
};

interface MentionSuggestionListProps {
  people: MentionSuggestionPerson[];
  onSelect: (person: MentionSuggestionPerson) => void;
  placement?: 'above' | 'below';
  className?: string;
}

export function MentionSuggestionList({
  people,
  onSelect,
  placement = 'above',
  className,
}: MentionSuggestionListProps) {
  if (!people.length) return null;

  return (
    <ul
      className={cn(
        'z-20 max-h-56 overflow-y-auto rounded-none border border-[#dbdbdb] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.12)] [scrollbar-width:thin]',
        placement === 'above'
          ? 'absolute bottom-full left-0 right-0 mb-1'
          : 'absolute left-0 right-0 top-full mt-1',
        className
      )}
    >
      {people.map((person) => (
        <li key={person.profileId} className="border-b border-[#efefef] last:border-b-0">
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 active:bg-neutral-100"
            onClick={() => onSelect(person)}
          >
            <ProfileAvatar
              name={person.name}
              avatarUrl={person.avatarUrl}
              avatarSeed={person.avatarSeed}
              avatarStyle={person.avatarStyle}
              size="sm"
              rounded="full"
              className="h-9 w-9"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight text-[#262626]">
                {person.name}
              </span>
              <span className="mt-0.5 block truncate text-xs leading-tight text-[#737373]">
                {person.subtitle || `@${person.name}`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
