'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunityAddMembersPanel } from '@/components/community/CommunityAddMembersPanel';
import { communityAPI, type CommunityMember } from '@/lib/api/community';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useAuthStore } from '@/lib/store/authStore';

interface CommunityMembersTabProps {
  communityId: string;
  isAdmin: boolean;
  onLeft?: () => void;
}

export function CommunityMembersTab({
  communityId,
  isAdmin,
  onLeft,
}: CommunityMembersTabProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async () => {
      const res = await communityAPI.members(communityId);
      return res.data.data.members ?? [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: (profileId: string) => communityAPI.removeMember(communityId, profileId),
    onSuccess: (_data, profileId) => {
      queryClient.setQueryData<CommunityMember[]>(['community-members', communityId], (old) =>
        old ? old.filter((row) => row.profile.id !== profileId) : old
      );
      void queryClient.invalidateQueries({ queryKey: ['community-members', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-dashboard', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community', communityId] });
      void queryClient.invalidateQueries({ queryKey: ['community-add-people', communityId] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => communityAPI.leave(communityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      onLeft?.();
    },
  });

  const members = membersQuery.data ?? [];

  return (
    <div className="space-y-4">
      {isAdmin ? <CommunityAddMembersPanel communityId={communityId} title="Add member" /> : null}

      <div className="section-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Members</p>
          <p className="text-xs text-muted-foreground">
            {isAdmin ? 'Admins can remove members from this community' : `${members.length} people`}
          </p>
        </div>
        {membersQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((member) => {
              const isMe = String(member.profile.id) === String(selectedProfile?._id);
              const removing =
                removeMutation.isPending && removeMutation.variables === member.profile.id;
              const canRemove = isAdmin && !isMe;
              return (
                <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <ProfileAvatar
                    name={member.profile.name}
                    avatarUrl={member.profile.avatarUrl}
                    avatarSeed={member.profile.avatarSeed}
                    avatarStyle={member.profile.avatarStyle}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {member.profile.name}
                      {isMe ? ' (you)' : ''}
                    </p>
                    <p className="text-[11px] capitalize text-muted-foreground">{member.role}</p>
                  </div>
                  {canRemove ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={removeMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(`Remove ${member.profile.name} from this community?`)
                        ) {
                          removeMutation.mutate(member.profile.id);
                        }
                      }}
                    >
                      {removing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserMinus className="h-3.5 w-3.5" />
                      )}
                      {removing ? 'Removing…' : 'Remove'}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full"
        disabled={leaveMutation.isPending}
        onClick={() => {
          if (window.confirm('Leave this community?')) {
            leaveMutation.mutate();
          }
        }}
      >
        {leaveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Leave community
      </Button>
    </div>
  );
}
