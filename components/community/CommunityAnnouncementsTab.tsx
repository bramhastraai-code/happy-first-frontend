'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Megaphone, Pin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunityConfirm } from '@/components/community/useCommunityConfirm';
import { communityAPI, type CommunityAnnouncement } from '@/lib/api/community';
import { DateTime } from 'luxon';

interface CommunityAnnouncementsTabProps {
  communityId: string;
  isModerator: boolean;
}

export function CommunityAnnouncementsTab({
  communityId,
  isModerator,
}: CommunityAnnouncementsTabProps) {
  const queryClient = useQueryClient();
  const { requestConfirm, ConfirmDialogElement } = useCommunityConfirm();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['community-announcements', communityId, isModerator],
    queryFn: async () => {
      const res = await communityAPI.announcements(communityId, {
        includeDrafts: isModerator,
      });
      return res.data.data.announcements ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      communityAPI.createAnnouncement(communityId, {
        title: title.trim(),
        body: body.trim(),
        pinned,
        status: 'published',
      }),
    onSuccess: () => {
      setTitle('');
      setBody('');
      setPinned(false);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['community-announcements', communityId] });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not publish announcement'
      );
    },
  });

  const pinMutation = useMutation({
    mutationFn: (row: CommunityAnnouncement) =>
      communityAPI.updateAnnouncement(communityId, row.id, { pinned: !row.pinned }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-announcements', communityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => communityAPI.deleteAnnouncement(communityId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-announcements', communityId] });
    },
  });

  const announcements = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      {isModerator ? (
        <div className="section-card space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">New announcement</p>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-10 w-full rounded-xl border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message for members…"
            rows={4}
            className="w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Pin to top
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button
            className="w-full"
            disabled={
              !title.trim() || !body.trim() || createMutation.isPending
            }
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Publish
          </Button>
        </div>
      ) : null}

      <div className="section-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Announcements</p>
          <p className="text-xs text-muted-foreground">
            Updates from admins and moderators
          </p>
        </div>
        {listQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No announcements yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {announcements.map((row) => (
              <li key={row.id} className="space-y-2 px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {row.pinned ? (
                        <Pin className="mr-1 inline h-3.5 w-3.5 text-primary" />
                      ) : null}
                      {row.title}
                      {row.status === 'draft' ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase text-muted-foreground">
                          Draft
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.author.name}
                      {row.publishedAt
                        ? ` · ${DateTime.fromISO(row.publishedAt).toFormat('d LLL yyyy')}`
                        : ''}
                    </p>
                  </div>
                  {isModerator ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={row.pinned ? 'Unpin' : 'Pin'}
                        disabled={pinMutation.isPending}
                        onClick={() => pinMutation.mutate(row)}
                      >
                        <Pin className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          requestConfirm({
                            title: 'Delete this announcement?',
                            description:
                              'The announcement will be permanently removed. This action cannot be undone.',
                            confirmLabel: 'Delete',
                            onConfirm: () => deleteMutation.mutateAsync(row.id),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">{row.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {ConfirmDialogElement}
    </div>
  );
}
