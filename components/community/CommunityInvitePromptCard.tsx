'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { communityAPI, type Community } from '@/lib/api/community';
import { cn } from '@/lib/utils';

interface CommunityInvitePromptCardProps {
  className?: string;
}

export function CommunityInvitePromptCard({ className }: CommunityInvitePromptCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const invitesQuery = useQuery({
    queryKey: ['community-my-invites'],
    queryFn: async () => {
      const res = await communityAPI.myInvites();
      return res.data.data.communities ?? [];
    },
    staleTime: 30_000,
  });

  const acceptMutation = useMutation({
    mutationFn: (communityId: string) => communityAPI.acceptInvite(communityId),
    onSuccess: (_res, communityId) => {
      void queryClient.invalidateQueries({ queryKey: ['community-my-invites'] });
      void queryClient.invalidateQueries({ queryKey: ['communities-mine'] });
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      router.push(`/community/${communityId}`);
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not accept invitation'
      );
      setAcceptingId(null);
    },
  });

  const invites: Community[] = invitesQuery.data ?? [];
  if (invitesQuery.isLoading || invites.length === 0) return null;

  return (
    <div
      className={cn(
        'section-card border-primary/30 bg-primary-soft/40 p-4',
        className
      )}
      role="dialog"
      aria-label="Community invitations"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Community invitation</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Accept to join. Important: you’ll appear in the community after you confirm.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {invites.map((community) => {
          const busy = acceptingId === community.id && acceptMutation.isPending;
          return (
            <li
              key={community.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{community.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {community.activities?.map((a) => a.name).filter(Boolean).slice(0, 3).join(' · ') ||
                    'Tap accept to join'}
                </p>
              </div>
              <Button
                size="sm"
                disabled={acceptMutation.isPending}
                onClick={() => {
                  setError('');
                  setAcceptingId(community.id);
                  acceptMutation.mutate(community.id);
                }}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Accept
              </Button>
            </li>
          );
        })}
      </ul>

      {error ? <p className="mt-2 text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
