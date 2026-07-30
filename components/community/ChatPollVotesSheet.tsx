'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import type { CommunityMember, CommunityPoll } from '@/lib/api/community';
import { enrichPollWithMemberProfiles } from '@/lib/utils/pollVoters';

interface ChatPollVotesSheetProps {
  open: boolean;
  poll: CommunityPoll;
  memberProfileById?: Map<string, CommunityMember['profile']>;
  onClose: () => void;
}

export function ChatPollVotesSheet({
  open,
  poll,
  memberProfileById,
  onClose,
}: ChatPollVotesSheetProps) {
  const enrichedPoll = useMemo(() => {
    if (!memberProfileById?.size) return poll;
    return enrichPollWithMemberProfiles(poll, memberProfileById);
  }, [memberProfileById, poll]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(84vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#111b21]">Poll votes</p>
            <p className="truncate text-[11px] text-[#667781]">{enrichedPoll.question}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {enrichedPoll.anonymous ? (
            <div className="space-y-3">
              <p className="text-xs text-[#667781]">
                This poll is anonymous. Only vote counts are shown.
              </p>
              {enrichedPoll.options.map((option) => (
                <div key={option.id} className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#111b21]">{option.text}</p>
                  <p className="shrink-0 text-xs text-[#667781]">
                    {option.voteCount} vote{option.voteCount === 1 ? '' : 's'}
                  </p>
                </div>
              ))}
            </div>
          ) : enrichedPoll.totalVotes === 0 ? (
            <p className="py-8 text-center text-sm text-[#667781]">No votes yet.</p>
          ) : (
            <div className="space-y-4">
              {enrichedPoll.options
                .filter((option) => option.voteCount > 0)
                .map((option) => (
                  <div key={option.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#111b21]">{option.text}</p>
                      <span className="shrink-0 text-xs font-medium text-[#667781]">
                        {option.voteCount}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {(option.voters || []).map((voter) => (
                        <div
                          key={`${option.id}-${voter.profileId}`}
                          className="flex items-center gap-2"
                        >
                          <Link
                            href={`/feed/profile/${voter.profileId}`}
                            className="flex min-w-0 items-center gap-2"
                          >
                            <ProfileAvatar
                              name={voter.name}
                              avatarUrl={voter.avatarUrl}
                              avatarSeed={voter.avatarSeed}
                              avatarStyle={voter.avatarStyle}
                              size="sm"
                              className="h-8 w-8"
                            />
                            <p className="truncate text-sm text-[#111b21] hover:underline">
                              {voter.name || 'Member'}
                            </p>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
