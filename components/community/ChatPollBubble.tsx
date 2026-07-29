'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ChatPollVotesSheet } from '@/components/community/ChatPollVotesSheet';
import type { CommunityMember, CommunityMessage, CommunityPoll } from '@/lib/api/community';
import { enrichPollWithMemberProfiles } from '@/lib/utils/pollVoters';
import { cn } from '@/lib/utils';

interface ChatPollBubbleProps {
  message: CommunityMessage;
  mine: boolean;
  canModerate?: boolean;
  voting?: boolean;
  closing?: boolean;
  memberProfileById?: Map<string, CommunityMember['profile']>;
  onVote: (optionIds: string[]) => void;
  onClose?: () => void;
}

function PollOptionAvatars({
  voters,
  mine,
}: {
  voters: NonNullable<CommunityPoll['options'][0]['voters']>;
  mine: boolean;
}) {
  const preview = voters.slice(0, 2);
  if (!preview.length) return null;

  return (
    <span className="flex shrink-0 -space-x-1.5">
      {preview.map((voter) => (
        <ProfileAvatar
          key={voter.profileId}
          name={voter.name}
          avatarUrl={voter.avatarUrl}
          avatarSeed={voter.avatarSeed}
          avatarStyle={voter.avatarStyle}
          size="sm"
          className={cn(
            'h-[22px] w-[22px] border border-white/30 ring-2',
            mine ? 'ring-primary' : 'ring-[#1f2c33]'
          )}
        />
      ))}
    </span>
  );
}

export function ChatPollBubble({
  message,
  mine,
  canModerate,
  voting,
  closing,
  memberProfileById,
  onVote,
  onClose,
}: ChatPollBubbleProps) {
  const [votesOpen, setVotesOpen] = useState(false);

  const poll = useMemo(() => {
    const raw = message.poll as CommunityPoll | null | undefined;
    if (!raw) return null;
    return memberProfileById?.size
      ? enrichPollWithMemberProfiles(raw, memberProfileById)
      : raw;
  }, [memberProfileById, message.poll]);

  if (!poll) return null;

  const selected = poll.options.filter((o) => o.votedByMe).map((o) => o.id);
  const closed = poll.closed;
  const totalVotes = poll.totalVotes;
  const showResults = closed || totalVotes > 0 || selected.length > 0;
  const maxVotes = Math.max(...poll.options.map((o) => o.voteCount), 1);

  const toggle = (optionId: string) => {
    if (closed || voting) return;
    if (poll.allowMultiple) {
      const next = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      onVote(next);
      return;
    }
    if (selected.includes(optionId)) {
      onVote([]);
      return;
    }
    onVote([optionId]);
  };

  return (
    <>
      <div className={cn('w-full min-w-0', mine ? 'text-primary-foreground' : '')}>
        <p className="pr-5 text-[16px] font-semibold leading-snug">{poll.question}</p>

        <p
          className={cn(
            'mt-1 flex items-center gap-1.5 text-[12px]',
            mine ? 'text-primary-foreground/70' : 'text-[#667781]'
          )}
        >
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          {poll.allowMultiple ? 'Select one or more' : 'Select one'}
          {closed ? ' · Closed' : ''}
        </p>

        <div className="mt-3 space-y-3">
          {poll.options.map((option) => {
            const barPct =
              showResults && option.voteCount > 0
                ? Math.max(4, Math.round((option.voteCount / maxVotes) * 100))
                : 0;

            return (
              <button
                key={option.id}
                type="button"
                disabled={closed || voting}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(option.id);
                }}
                className={cn(
                  'w-full min-w-0 text-left transition disabled:cursor-default',
                  !closed && !voting && 'active:opacity-80'
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      'flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-[3px]',
                      option.votedByMe
                        ? mine
                          ? 'border-white bg-white text-primary'
                          : 'border-primary bg-primary text-primary-foreground'
                        : mine
                          ? 'border-primary-foreground/50'
                          : 'border-[#9da4a8]'
                    )}
                  >
                    {option.votedByMe ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-[16px] font-medium">
                    {option.text}
                  </span>

                  {showResults ? (
                    <span className="flex shrink-0 items-center gap-2">
                      {!poll.anonymous ? (
                        <PollOptionAvatars voters={option.voters || []} mine={mine} />
                      ) : null}
                      <span
                        className={cn(
                          'min-w-3 text-right tabular-nums text-[13px] font-medium',
                          mine ? 'text-primary-foreground/85' : 'text-[#54656f]'
                        )}
                      >
                        {option.voteCount}
                      </span>
                    </span>
                  ) : null}
                </div>

                <div
                  className={cn(
                    'ml-[29px] mt-2 h-[3px] w-[calc(100%-84px)] overflow-hidden rounded-full',
                    mine ? 'bg-black/15' : 'bg-black/[0.14]'
                  )}
                >
                  {showResults && option.voteCount > 0 ? (
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        mine ? 'bg-white/90' : 'bg-primary'
                      )}
                      style={{ width: `${barPct}%` }}
                    />
                  ) : (
                    <div className="h-full w-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {(showResults || canModerate) && (
          <div
            className={cn(
              'mt-3 border-t pt-2',
              mine ? 'border-white/20' : 'border-black/[0.06]'
            )}
          >
            {showResults && totalVotes > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setVotesOpen(true);
                }}
                className={cn(
                  'w-full py-1 text-center text-[15px] font-semibold transition hover:opacity-80',
                  mine ? 'text-primary-foreground' : 'text-primary'
                )}
              >
                View votes
              </button>
            ) : null}

            {canModerate && !closed && onClose ? (
              <button
                type="button"
                disabled={closing}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-1 py-0.5 text-[14px] font-semibold',
                  mine
                    ? 'text-primary-foreground/75 hover:text-primary-foreground'
                    : 'text-[#667781] hover:text-[#111b21]',
                  'disabled:opacity-50'
                )}
              >
                {closing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Close poll
              </button>
            ) : null}
          </div>
        )}
      </div>

      <ChatPollVotesSheet
        open={votesOpen}
        poll={poll}
        memberProfileById={memberProfileById}
        onClose={() => setVotesOpen(false)}
      />
    </>
  );
}
