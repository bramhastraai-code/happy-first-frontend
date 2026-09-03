'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Grid3X3, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ProfilePhotoButton } from '@/components/feed/ProfilePhotoButton';
import { headerBackBtnClass, pageStickyHeaderClass } from '@/components/ui/AppPageHeader';
import { Button } from '@/components/ui/button';
import { FollowButton } from '@/components/feed/FollowButton';
import { FollowListSheet } from '@/components/feed/FollowListSheet';
import { FeedMessagesPanel } from '@/components/feed/FeedMessagesPanel';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { ProfilePostViewer } from '@/components/feed/ProfilePostViewer';
import { ProfileEditSheet } from '@/components/feed/ProfileEditSheet';
import ReferralPromoCard from '@/components/profile/ReferralPromoCard';
import { followAPI } from '@/lib/api/follow';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { communityAPI } from '@/lib/api/community';
import { dailyLogAPI, type WeeklySummary } from '@/lib/api/dailyLog';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { todayInProfileZone } from '@/lib/utils/profileTime';

function displayWebsite(url?: string | null) {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

export default function FeedProfilePage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileId = String(params?.profileId || '');
  const { selectedProfile, user, isHydrated, accessToken } = useAuthStore();
  const [listMode, setListMode] = useState<'followers' | 'following' | null>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [gridTab, setGridTab] = useState<'posts' | 'spark'>('posts');

  const enabled = isHydrated && !!accessToken && !!profileId;
  const postsKey = ['profilePosts', profileId, gridTab] as const;

  const profileQuery = useQuery({
    queryKey: ['publicProfile', profileId],
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const res = await followAPI.getPublicProfile(profileId);
      return res.data.data;
    },
  });

  const isOwnProfile =
    Boolean(selectedProfile?._id) && String(selectedProfile?._id) === String(profileId);

  // Own profile: also read Home’s weekly summary so “This week %” always matches Week score.
  const ownWeekQuery = useQuery({
    queryKey: ['profileOwnWeekScore', profileId],
    enabled: enabled && isOwnProfile,
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const date = todayInProfileZone();
      const res = await dailyLogAPI.getSummary('weekly', date);
      return res.data.data as WeeklySummary;
    },
  });

  const data = profileQuery.data;
  const thisWeekPercent = (() => {
    if (
      isOwnProfile &&
      ownWeekQuery.data &&
      typeof ownWeekQuery.data.totalPoints === 'number' &&
      !Number.isNaN(ownWeekQuery.data.totalPoints)
    ) {
      return Number(ownWeekQuery.data.totalPoints.toFixed(2));
    }
    if (data?.thisWeekCompletionPercent != null && !Number.isNaN(Number(data.thisWeekCompletionPercent))) {
      return Number(Number(data.thisWeekCompletionPercent).toFixed(2));
    }
    return 0;
  })();

  const postsQuery = useQuery({
    queryKey: postsKey,
    enabled,
    queryFn: async () => {
      const res = await followAPI.getPosts(profileId, { limit: 36, tab: gridTab });
      return res.data.data;
    },
  });

  const posts = useMemo(() => {
    const raw = postsQuery.data?.posts || [];
    if (!data?.profile) return raw;
    return raw.map((post) => ({
      ...post,
      author: {
        ...post.author,
        avatarUrl: post.author.avatarUrl ?? data.profile.avatarUrl,
        avatarSeed: post.author.avatarSeed ?? data.profile.avatarSeed,
        avatarStyle: post.author.avatarStyle ?? data.profile.avatarStyle,
      },
    }));
  }, [postsQuery.data?.posts, data?.profile]);
  const isMe = Boolean(data?.isMe || selectedProfile?._id === profileId);
  const overlayOpen = viewerIndex !== null || Boolean(activePost) || editOpen;

  const patchPost = (postId: string, patch: Partial<FeedPost>) => {
    queryClient.setQueryData<{ posts: FeedPost[]; nextCursor: string | null }>(
      postsKey,
      (old) => {
        if (!old?.posts) return old;
        return {
          ...old,
          posts: old.posts.map((item) => (item.id === postId ? { ...item, ...patch } : item)),
        };
      }
    );
    setActivePost((prev) => (prev?.id === postId ? { ...prev, ...patch } : prev));
  };

  const likeMutation = useMutation({
    mutationFn: (postId: string) => feedAPI.toggleLike(postId),
    onMutate: async (postId) => {
      setLikingId(postId);
      const previous = queryClient.getQueryData(postsKey);
      const target = posts.find((p) => p.id === postId);
      if (target) {
        const likedByMe = !target.likedByMe;
        patchPost(postId, {
          likedByMe,
          likeCount: Math.max(0, target.likeCount + (likedByMe ? 1 : -1)),
        });
      }
      return { previous };
    },
    onError: (_err, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postsKey, context.previous);
      }
    },
    onSettled: () => setLikingId(null),
  });

  const repostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await feedAPI.toggleRepost(postId);
      return res.data.data;
    },
    onMutate: async (postId) => {
      setRepostingId(postId);
      const previous = queryClient.getQueryData(postsKey);
      const target = posts.find((p) => p.id === postId);
      if (target) {
        const repostedByMe = !target.repostedByMe;
        patchPost(postId, {
          repostedByMe,
          repostCount: Math.max(0, (target.repostCount ?? 0) + (repostedByMe ? 1 : -1)),
        });
      }
      return { previous };
    },
    onSuccess: (result) => {
      patchPost(result.photoId, {
        repostedByMe: result.reposted,
        repostCount: result.repostCount,
      });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (_err, _postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(postsKey, context.previous);
      }
    },
    onSettled: () => setRepostingId(null),
  });

  const messageTarget = useMemo(() => {
    if (!data?.profile?.userId || data.profile.userId === user?._id) return null;
    return {
      userId: data.profile.userId,
      profileId: data.profile.profileId,
      name: data.profile.name,
      avatarUrl: data.profile.avatarUrl,
      avatarSeed: data.profile.avatarSeed,
      avatarStyle: data.profile.avatarStyle,
    };
  }, [data, user?._id]);

  if (!isHydrated) {
    return (
      <MainLayout>
        <LoadingScreen fullScreen label="Loading profile…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout hideBottomNav={overlayOpen}>
      <div className="relative w-full pb-6">
        <div className={cn(pageStickyHeaderClass, 'mb-2 flex items-center justify-between gap-2')}>
          <button
            type="button"
            onClick={() => router.back()}
            className={headerBackBtnClass}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-foreground">
            {data?.profile.name || 'Profile'}
          </p>
          <span className="h-10 w-10 shrink-0" aria-hidden />
        </div>

        {profileQuery.isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profileQuery.isError || !data ? (
          <div className="px-2 py-16 text-center">
            <p className="text-sm font-semibold text-foreground">Profile not found</p>
            <Button className="mt-4" onClick={() => router.push('/feed')}>
              Back to feed
            </Button>
          </div>
        ) : (
          <>
            {/* Instagram-style profile header */}
            <section className="px-1 pt-1">
              <div className="flex items-start gap-6 sm:gap-10">
                <div className="flex shrink-0 flex-col items-center">
                  <ProfilePhotoButton
                    profile={data.profile}
                    canEdit={isMe}
                    sizeClassName="h-[86px] w-[86px] text-2xl ring-1 ring-border sm:h-24 sm:w-24"
                  />
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 text-center">
                  <div className="py-1">
                    <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                      {(data.postsCount || 0) + (data.sparkCount || 0)}
                    </p>
                    <p className="text-xs text-foreground/80">posts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setListMode('followers')}
                    className="rounded-lg py-1 transition-colors hover:bg-secondary/60"
                  >
                    <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                      {data.followersCount}
                    </p>
                    <p className="text-xs text-foreground/80">followers</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setListMode('following')}
                    className="rounded-lg py-1 transition-colors hover:bg-secondary/60"
                  >
                    <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                      {data.followingCount}
                    </p>
                    <p className="text-xs text-foreground/80">following</p>
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <h1 className="text-sm font-semibold text-foreground">{data.profile.name}</h1>
                {data.profile.city ? (
                  <p className="text-xs text-muted-foreground">{data.profile.city}</p>
                ) : null}
                {data.followsYou && !data.isMe ? (
                  <p className="text-xs text-muted-foreground">Follows you</p>
                ) : null}
                {data.profile.publicHighlight ? (
                  <p className="text-sm leading-snug text-foreground">
                    {data.profile.publicHighlight}
                  </p>
                ) : isMe ? (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="text-sm text-muted-foreground"
                  >
                    Add a public highlight…
                  </button>
                ) : null}
                {data.profile.bio ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-snug text-foreground">
                    {data.profile.bio}
                  </p>
                ) : isMe ? (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="text-sm text-muted-foreground"
                  >
                    Add a bio…
                  </button>
                ) : null}
                {data.profile.website ? (
                  <a
                    href={data.profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block break-all text-sm font-semibold text-primary hover:underline"
                  >
                    {displayWebsite(data.profile.website)}
                  </a>
                ) : isMe ? (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="block text-sm text-muted-foreground"
                  >
                    Add a link…
                  </button>
                ) : null}
                {data.profile.memberSince || data.profile.createdAt ? (
                  <p className="pt-0.5 text-xs text-muted-foreground">
                    Member since{' '}
                    {new Date(
                      (data.profile.memberSince || data.profile.createdAt) as string
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {data.profile.daysWithHappyFirst != null
                      ? ` · ${data.profile.daysWithHappyFirst} days with Happy First`
                      : ''}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-none border border-[#dbdbdb] bg-white sm:grid-cols-4">
                {(
                  [
                    {
                      label: 'This week',
                      display: `${thisWeekPercent.toFixed(2)}%`,
                    },
                    {
                      label: 'Activities',
                      display: Number(data.totalActivitiesTotal ?? 0).toLocaleString(),
                    },
                    {
                      label: 'XP',
                      display: Number(data.xpTotal ?? 0).toLocaleString(),
                    },
                    {
                      label: 'Coins',
                      display: Number(data.coinsBalance ?? 0).toLocaleString(),
                    },
                  ] as const
                ).map((stat, i) => (
                  <div
                    key={stat.label}
                    className={cn(
                      'px-2 py-2.5 text-center',
                      i % 2 === 0 && 'border-r border-[#efefef]',
                      i < 2 && 'border-b border-[#efefef] sm:border-b-0',
                      i < 3 && 'sm:border-r sm:border-[#efefef]'
                    )}
                  >
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {stat.display}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                {isMe ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="h-8 flex-1 rounded-none border border-[#dbdbdb] bg-[#efefef] text-sm font-semibold text-foreground transition-colors hover:bg-[#dbdbdb]"
                    >
                      Edit profile
                    </button>
                    <Link
                      href="/settings"
                      className="inline-flex h-8 flex-1 items-center justify-center rounded-none border border-[#dbdbdb] bg-[#efefef] text-sm font-semibold text-foreground transition-colors hover:bg-[#dbdbdb]"
                    >
                      Settings
                    </Link>
                  </>
                ) : (
                  <>
                    <FollowButton
                      profileId={profileId}
                      isFollowing={data.isFollowing}
                      followsYou={data.followsYou}
                      isMe={false}
                      className="h-8 flex-1 !rounded-none"
                    />
                    {messageTarget && (data.allowMessages ?? data.profile.allowMessages ?? true) ? (
                      <button
                        type="button"
                        onClick={() => setMessagesOpen(true)}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-none border border-[#dbdbdb] bg-[#efefef] text-sm font-semibold text-foreground transition-colors hover:bg-[#dbdbdb]"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </button>
                    ) : !isMe && messageTarget ? (
                      <p className="flex h-8 flex-1 items-center justify-center text-xs text-neutral-400">
                        Messaging is off
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            {(data.communities?.length ?? 0) > 0 ? (
              <section className="mt-5 px-1">
                <h2 className="mb-2 px-1 text-[13px] font-semibold text-neutral-500">
                  {isMe ? 'Communities you admin' : 'Communities they admin'}
                </h2>
                <ul className="divide-y divide-[#efefef] overflow-hidden rounded-none border border-[#dbdbdb] bg-white">
                  {data.communities!.map((community) => (
                    <li key={community.id} className="flex items-center gap-3 px-4 py-3">
                      <Link
                        href={`/community/${community.id}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-sm text-foreground">{community.name}</p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
                        </p>
                      </Link>
                      {community.viewerIsMember ? (
                        <Link
                          href={`/community/${community.id}`}
                          className="shrink-0 text-xs font-semibold text-primary"
                        >
                          Open
                        </Link>
                      ) : community.viewerMembershipStatus === 'pending' ? (
                        <Link
                          href={`/community/${community.id}`}
                          className="shrink-0 rounded-none border border-[#dbdbdb] bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-500"
                        >
                          Requested
                        </Link>
                      ) : community.viewerCanJoin ? (
                        <button
                          type="button"
                          disabled={joiningId === community.id}
                          onClick={async () => {
                            setJoiningId(community.id);
                            try {
                              const res = await communityAPI.join(community.id);
                              const nextStatus =
                                res.data.data.community?.myMembershipStatus || 'pending';
                              queryClient.setQueryData(
                                ['publicProfile', profileId],
                                (old: typeof data) => {
                                  if (!old?.communities) return old;
                                  return {
                                    ...old,
                                    communities: old.communities.map((item) =>
                                      item.id === community.id
                                        ? {
                                            ...item,
                                            viewerCanJoin: false,
                                            viewerIsMember: nextStatus === 'active',
                                            viewerMembershipStatus: nextStatus,
                                          }
                                        : item
                                    ),
                                  };
                                }
                              );
                              await queryClient.invalidateQueries({
                                queryKey: ['publicProfile', profileId],
                              });
                              if (nextStatus === 'active') {
                                router.push(`/community/${community.id}`);
                              }
                            } finally {
                              setJoiningId(null);
                            }
                          }}
                          className="shrink-0 rounded-none bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          {joiningId === community.id ? 'Requesting…' : 'Join'}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {isMe ? (
              <div className="mt-5 px-1">
                <ReferralPromoCard compact />
              </div>
            ) : null}

            <div
              id="profile-posts-grid"
              className="mt-4 flex items-center justify-center gap-1 border-b border-border"
            >
              <button
                type="button"
                onClick={() => {
                  setGridTab('posts');
                  setViewerIndex(null);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide',
                  gridTab === 'posts'
                    ? 'border-t border-foreground text-foreground'
                    : 'border-t border-transparent text-muted-foreground'
                )}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                {isMe ? 'My posts' : 'Posts'} ({data.postsCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setGridTab('spark');
                  setViewerIndex(null);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide',
                  gridTab === 'spark'
                    ? 'border-t border-foreground text-foreground'
                    : 'border-t border-transparent text-muted-foreground'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Spark ({data.sparkCount || 0})
              </button>
            </div>

            {postsQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {gridTab === 'spark'
                  ? isMe
                    ? 'No Sparks yet. Invite someone when you post — it shows here after they accept.'
                    : 'No Sparks yet'
                  : 'No posts yet'}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-0.5 sm:gap-2">
                {posts.map((post, index) => {
                  const cover = post.mediaItems?.[0]?.url || post.imageUrl;
                  const isVideo =
                    (post.mediaItems?.[0]?.mediaType || post.mediaType) === 'video';
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setViewerIndex(index)}
                      className={cn(
                        'relative aspect-square overflow-hidden bg-neutral-900',
                        'sm:rounded-lg'
                      )}
                    >
                      {isVideo ? (
                        <video
                          src={resolveMediaUrl(cover)}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(cover)}
                          alt={post.caption || data.profile.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {(post.mediaItems?.length || 0) > 1 ? (
                        <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {post.mediaItems!.length}
                        </span>
                      ) : null}
                      {gridTab === 'spark' ? (
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/55 p-1 text-white">
                          <Sparkles className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <FollowListSheet
        open={listMode !== null}
        onClose={() => setListMode(null)}
        profileId={profileId}
        mode={listMode || 'followers'}
      />

      <FeedMessagesPanel
        open={messagesOpen}
        onClose={() => setMessagesOpen(false)}
        startWithUser={messageTarget}
      />

      <ProfilePostViewer
        open={viewerIndex !== null}
        posts={posts}
        startIndex={viewerIndex ?? 0}
        isOwner={isMe}
        likingId={likingId}
        repostingId={repostingId}
        onClose={() => setViewerIndex(null)}
        onToggleLike={(postId) => likeMutation.mutate(postId)}
        onToggleRepost={(postId) => repostMutation.mutate(postId)}
        onOpenComments={(post) => setActivePost(post)}
        onEdit={async (target, caption, extras) => {
          const res = await feedAPI.updatePost(target.id, caption, extras);
          patchPost(target.id, res.data.data.post);
        }}
        onDelete={async (target) => {
          await feedAPI.deletePost(target.id);
          queryClient.setQueryData<{ posts: FeedPost[]; nextCursor: string | null }>(
            postsKey,
            (old) => {
              if (!old?.posts) return old;
              return {
                ...old,
                posts: old.posts.filter((item) => item.id !== target.id),
              };
            }
          );
          void queryClient.invalidateQueries({ queryKey: ['publicProfile', profileId] });
          void queryClient.invalidateQueries({ queryKey: ['feed'] });
          if (activePost?.id === target.id) setActivePost(null);
        }}
        onLeaveSpark={async (target) => {
          if (!selectedProfile?._id) return;
          await feedAPI.removeCollaborator(target.id, selectedProfile._id);
          queryClient.setQueryData<{ posts: FeedPost[]; nextCursor: string | null }>(
            postsKey,
            (old) => {
              if (!old?.posts) return old;
              return {
                ...old,
                posts: old.posts.filter((item) => item.id !== target.id),
              };
            }
          );
          void queryClient.invalidateQueries({ queryKey: ['publicProfile', profileId] });
          void queryClient.invalidateQueries({ queryKey: ['feed'] });
          void queryClient.invalidateQueries({ queryKey: ['profilePosts'] });
          if (activePost?.id === target.id) setActivePost(null);
        }}
      />

      {activePost ? (
        <FeedCommentsSheet
          post={activePost}
          open={Boolean(activePost)}
          onClose={() => setActivePost(null)}
        />
      ) : null}

      <ProfileEditSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profileId={profileId}
      />
    </MainLayout>
  );
}
