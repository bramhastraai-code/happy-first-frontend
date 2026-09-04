'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import {
  communityAPI,
  type CommunityMember,
  type ProfileSearchResult,
} from '@/lib/api/community';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

interface CommunityAddMembersPanelProps {
  communityId: string;
  title?: string;
  subtitle?: string;
}

export function CommunityAddMembersPanel({
  communityId,
  title = 'Invite',
  subtitle,
}: CommunityAddMembersPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
      setPage(1);
    }
  }, [open]);

  const peopleQuery = useQuery({
    queryKey: ['community-add-people', communityId, debounced, page],
    enabled: open,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await communityAPI.searchMembers(communityId, debounced, {
        page,
        limit: PAGE_SIZE,
      });
      return res.data.data;
    },
  });

  const addMember = useMutation({
    mutationFn: (profileId: string) => communityAPI.addMember(communityId, { profileId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-add-people', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-invited', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-dashboard', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
    },
  });

  const results: ProfileSearchResult[] = peopleQuery.data?.results ?? [];
  const totalPages = peopleQuery.data?.totalPages ?? 1;
  const currentPage = peopleQuery.data?.page ?? page;
  const showInitialLoader = peopleQuery.isLoading && !peopleQuery.data;

  return (
    <CollapsibleSection
      title={title}
      subtitle={subtitle}
      icon={UserPlus}
      expanded={open}
      onToggle={() => setOpen((value) => !value)}
      className="!rounded-[1.5rem]"
      contentClassName="space-y-3"
    >
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or phone"
          className="h-10 w-full rounded-xl border border-border bg-secondary/70 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          inputMode="search"
        />
      </label>

      {showInitialLoader ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {debounced ? 'No matches' : 'No one to invite'}
        </p>
      ) : (
        <>
          <ul
            className={cn(
              'relative max-h-[22rem] divide-y divide-border overflow-y-auto overscroll-contain rounded-xl border border-border',
              peopleQuery.isFetching && 'opacity-80',
              '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
            )}
          >
            {results.map((person) => {
              const adding =
                addMember.isPending && addMember.variables === person.profileId;
              return (
                <li key={person.profileId} className="flex items-center gap-3 px-3 py-2.5">
                  <Link href={`/feed/profile/${person.profileId}`} className="shrink-0">
                    <ProfileAvatar
                      name={person.name}
                      avatarUrl={person.avatarUrl}
                      avatarSeed={person.avatarSeed}
                      avatarStyle={person.avatarStyle}
                      size="sm"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/feed/profile/${person.profileId}`}
                      className="truncate text-sm font-semibold text-foreground hover:underline"
                    >
                      {person.name}
                    </Link>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addMember.isPending}
                    onClick={() => addMember.mutate(person.profileId)}
                  >
                    {adding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {adding ? '…' : 'Invite'}
                  </Button>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1 || peopleQuery.isFetching}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages || peopleQuery.isFetching}
                onClick={() => setPage((value) => value + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </CollapsibleSection>
  );
}
