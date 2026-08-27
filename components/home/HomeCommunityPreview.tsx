'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Users } from 'lucide-react';
import { communityAPI, type Community } from '@/lib/api/community';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

interface HomeCommunityPreviewProps {
  expanded: boolean;
  onToggle: () => void;
}

function roleLabel(community: Community) {
  if (community.myRole === 'admin') return 'Admin';
  if (community.myRole === 'moderator') return 'Moderator';
  return 'Member';
}

/** Compact Community preview on Home — full page stays on /community. */
export function HomeCommunityPreview({ expanded, onToggle }: HomeCommunityPreviewProps) {
  const mineQuery = useQuery({
    queryKey: ['communities', 'mine'],
    enabled: expanded,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await communityAPI.mine();
      return res.data.data.communities ?? [];
    },
  });

  const communities = (mineQuery.data ?? []).slice(0, 4);

  return (
    <CollapsibleSection
      id="home-community"
      title="My community"
      subtitle="Groups you belong to"
      icon={Users}
      expanded={expanded}
      onToggle={onToggle}
      badge={communities.length ? `${communities.length}` : undefined}
      contentClassName="!p-0"
    >
      {mineQuery.isLoading ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : communities.length === 0 ? (
        <div className="space-y-3 px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t joined a community yet.
          </p>
          <Link href="/community" className="text-sm font-semibold text-primary hover:underline">
            Discover communities
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {communities.map((community) => (
            <li key={community.id}>
              <Link
                href={`/community/${community.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50"
              >
                <CommunityAvatar
                  name={community.name}
                  icon={community.icon}
                  avatarUrl={community.avatarUrl}
                  avatarSeed={community.avatarSeed}
                  avatarStyle={community.avatarStyle}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{community.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {roleLabel(community)} · {community.memberCount} members
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
          <li className="px-4 py-3">
            <Link
              href="/community"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Open Community →
            </Link>
          </li>
        </ul>
      )}
    </CollapsibleSection>
  );
}
