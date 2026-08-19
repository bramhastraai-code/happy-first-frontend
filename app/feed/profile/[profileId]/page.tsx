'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Grid3X3, Loader2, MessageSquare } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { headerBackBtnClass } from '@/components/ui/AppPageHeader';
import { Button } from '@/components/ui/button';
import { FollowButton } from '@/components/feed/FollowButton';
import { FollowListSheet } from '@/components/feed/FollowListSheet';
import { FeedMessagesPanel } from '@/components/feed/FeedMessagesPanel';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { ProfilePostViewer } from '@/components/feed/ProfilePostViewer';
import { ProfileEditSheet } from '@/components/feed/ProfileEditSheet';
import { followAPI } from '@/lib/api/follow';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { communityAPI } from '@/lib/api/community';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

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

  const enabled = isHydrated && !!accessToken && !!profileId;
  const postsKey = ['profilePosts', profileId] as const;

  const profileQuery = useQuery({
    queryKey: ['publicProfile', profileId],
    enabled,
    queryFn: async () => {
      const res = await followAPI.getPublicProfile(profileId);
      return res.data.data;
    },
  });

  const postsQuery = useQuery({
    queryKey: postsKey,
    enabled,
    queryFn: async () => {
      const res = await followAPI.getPosts(profileId, { limit: 36 });
      return res.data.data;
    },
  });

  const data = profileQuery.data;
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
        <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
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
              <div className="flex items-center gap-6 sm:gap-10">
                <ProfileAvatar
                  name={data.profile.name}
                  avatarUrl={data.profile.avatarUrl}
                  avatarSeed={data.profile.avatarSeed}
                  avatarStyle={data.profile.avatarStyle}
                  size="xl"
                  className="h-[86px] w-[86px] text-2xl ring-1 ring-border sm:h-24 sm:w-24"
                />
                <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 text-center">
                  <div className="py-1">
                    <p className="text-base font-bold tabular-nums text-foreground sm:text-lg">
                      {data.postsCount}
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

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    { label: 'This week', value: data.thisWeekActivitiesTotal ?? 0 },
                    { label: 'Activities', value: data.totalActivitiesTotal ?? 0 },
                    { label: 'XP', value: data.xpTotal ?? 0 },
                    { label: 'Coins', value: data.coinsBalance ?? 0 },
                  ] as const
                ).map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-center"
                  >
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {Number(stat.value).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
              {data.daysSinceLastPost != null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {data.daysSinceLastPost === 0
                    ? 'Posted today'
                    : `Last post ${data.daysSinceLastPost} day${data.daysSinceLastPost === 1 ? '' : 's'} ago`}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No posts yet</p>
              )}

              <div className="mt-3 flex gap-2">
                {isMe ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="h-8 flex-1 rounded-lg border border-border bg-surface text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
                    >
                      Edit profile
                    </button>
                    <Link
                      href="/settings"
                      className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
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
                      verb="connect"
                      className="h-8 flex-1 rounded-lg"
                    />
                    {messageTarget && (data.allowMessages ?? data.profile.allowMessages ?? true) ? (
                      <button
                        type="button"
                        onClick={() => setMessagesOpen(true)}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </button>
                    ) : !isMe && messageTarget ? (
                      <p className="flex h-8 flex-1 items-center justify-center text-xs text-muted-foreground">
                        Messaging is off
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            {(data.communities?.length ?? 0) > 0 ? (
              <section className="mt-4 px-1">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Communities they admin
                </h2>
                <ul className="space-y-2">
                  {data.communities!.map((community) => (
                    <li
                      key={community.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                    >
                      <Link
                        href={`/community/${community.id}`}
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground hover:underline"
                      >
                        {community.name}
                        <span className="ml-2 text-[11px] font-medium text-muted-foreground">
                          {community.memberCount} members
                        </span>
                      </Link>
                      {community.viewerCanJoin ? (
                        <button
                          type="button"
                          disabled={joiningId === community.id}
                          onClick={async () => {
                            setJoiningId(community.id);
                            try {
                              await communityAPI.join(community.id);
                              await queryClient.invalidateQueries({
                                queryKey: ['publicProfile', profileId],
                              });
                              router.push(`/community/${community.id}`);
                            } finally {
                              setJoiningId(null);
                            }
                          }}
                          className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                        >
                          {joiningId === community.id ? 'Joining…' : 'Join'}
                        </button>
                      ) : community.viewerIsMember ? (
                        <Link
                          href={`/community/${community.id}`}
                          className="shrink-0 text-xs font-semibold text-primary"
                        >
                          Open
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div
              id="profile-posts-grid"
              className="mt-4 flex items-center justify-center gap-3 border-b border-border"
            >
              <a
                href="#profile-posts-grid"
                className="inline-flex items-center gap-1.5 border-t border-foreground px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                View posts
              </a>
            </div>

            {postsQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No posts yet</p>
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
        onEdit={async (target, caption) => {
          const res = await feedAPI.updatePost(target.id, caption);
          patchPost(target.id, { caption: res.data.data.post.caption });
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
