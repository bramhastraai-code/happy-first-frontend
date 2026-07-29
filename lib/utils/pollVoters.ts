import type { CommunityMember, CommunityPoll } from '@/lib/api/community';

type MemberProfile = CommunityMember['profile'];

export function enrichPollWithMemberProfiles(
  poll: CommunityPoll,
  memberProfileById: Map<string, MemberProfile>
): CommunityPoll {
  if (!poll || poll.anonymous || !memberProfileById.size) return poll;

  return {
    ...poll,
    options: poll.options.map((option) => ({
      ...option,
      voters: (option.voters || []).map((voter) => {
        const member = memberProfileById.get(voter.profileId);
        const name =
          voter.name && voter.name !== 'Member'
            ? voter.name
            : member?.name || voter.name || 'Member';
        return {
          ...voter,
          name,
          avatarUrl: voter.avatarUrl ?? member?.avatarUrl ?? null,
          avatarSeed: voter.avatarSeed ?? member?.avatarSeed ?? null,
          avatarStyle: voter.avatarStyle ?? member?.avatarStyle ?? null,
        };
      }),
    })),
  };
}
