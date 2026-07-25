'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Grid3X3, Loader2, MessageSquare, Settings } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Button } from '@/components/ui/button';
import { FollowButton } from '@/components/feed/FollowButton';
import { FollowListSheet } from '@/components/feed/FollowListSheet';
import { FeedMessagesPanel } from '@/components/feed/FeedMessagesPanel';
import { followAPI } from '@/lib/api/follow';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

export default function FeedProfilePage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();
  const profileId = String(params?.profileId || '');
  const { selectedProfile, user, isHydrated, accessToken } = useAuthStore();
  const [listMode, setListMode] = useState<'followers' | 'following' | null>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const enabled = isHydrated && !!accessToken && !!profileId;

  const profileQuery = useQuery({
    queryKey: ['publicProfile', profileId],
    enabled,
    queryFn: async () => {
      const res = await followAPI.getPublicProfile(profileId);
      return res.data.data;
    },
  });

  const postsQuery = useQuery({
    queryKey: ['profilePosts', profileId],
    enabled,
    queryFn: async () => {
      const res = await followAPI.getPosts(profileId, { limit: 36 });
      return res.data.data;
    },
  });

  const data = profileQuery.data;
  const posts = postsQuery.data?.posts || [];
  const isMe = Boolean(data?.isMe || selectedProfile?._id === profileId);

  const messageTarget = useMemo(() => {
    if (!data?.profile?.userId || data.profile.userId === user?._id) return null;
    return {
      userId: data.profile.userId,
      profileId: data.profile.profileId,
      name: data.profile.name,
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
    <MainLayout>
      <div className="relative w-full pb-6">
        <header className="sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:bg-surface sm:px-4 sm:shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-foreground">
              {data?.profile.name || 'Profile'}
            </p>
            <p className="text-[11px] text-muted-foreground">Happy First</p>
          </div>
          {isMe ? (
            <Link
              href="/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          ) : null}
        </header>

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
            <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5 sm:shadow-[var(--shadow-card)]">
              <div className="flex items-start gap-4">
                <ProfileAvatar
                  name={data.profile.name}
                  avatarUrl={data.profile.avatarUrl}
                  avatarSeed={data.profile.avatarSeed}
                  avatarStyle={data.profile.avatarStyle}
                  size="xl"
                  className="ring-2 ring-primary/15"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-bold text-foreground">{data.profile.name}</h1>
                  {data.followsYou && !data.isMe ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">Follows you</p>
                  ) : null}

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-base font-bold text-foreground">{data.postsCount}</p>
                      <p className="text-[11px] text-muted-foreground">Posts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setListMode('followers')}
                      className="rounded-xl py-1 hover:bg-secondary/70"
                    >
                      <p className="text-base font-bold text-foreground">{data.followersCount}</p>
                      <p className="text-[11px] text-muted-foreground">Followers</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setListMode('following')}
                      className="rounded-xl py-1 hover:bg-secondary/70"
                    >
                      <p className="text-base font-bold text-foreground">{data.followingCount}</p>
                      <p className="text-[11px] text-muted-foreground">Following</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {isMe ? (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/settings">Edit profile</Link>
                  </Button>
                ) : (
                  <>
                    <FollowButton
                      profileId={profileId}
                      isFollowing={data.isFollowing}
                      followsYou={data.followsYou}
                      isMe={false}
                      className="flex-1"
                    />
                    {messageTarget ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setMessagesOpen(true)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </section>

            <div className="mt-4 flex items-center gap-2 border-b border-border px-1 pb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <Grid3X3 className="h-3.5 w-3.5" />
                Posts
              </span>
            </div>

            {postsQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No posts yet</p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-1 sm:gap-2">
                {posts.map((post) => {
                  const cover =
                    post.mediaItems?.[0]?.url || post.imageUrl;
                  const isVideo =
                    (post.mediaItems?.[0]?.mediaType || post.mediaType) === 'video';
                  return (
                    <Link
                      key={post.id}
                      href={`/feed?post=${post.id}`}
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
                    </Link>
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
    </MainLayout>
  );
}
