'use client';

import type { ReactNode } from 'react';
import { Users } from 'lucide-react';
import {
  COMMUNITY_AVATAR_STYLE,
  CommunityAvatar,
} from '@/components/community/CommunityAvatarPicker';
import type { Community, CommunityDiscoverOverview } from '@/lib/api/community';
import { communityTypeLabel } from '@/lib/api/community';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { buildDiceBearAvatarUrl } from '@/lib/utils/avatar';

const ACTIVITY_COLORS = ['#6CBC5A', '#4DB6A8', '#C6D63C', '#EA580C', '#7E9AAB', '#E8A838'];

function aboutBannerSrc(community: Community, overview?: CommunityDiscoverOverview) {
  const media = overview?.aboutMedia?.length
    ? overview.aboutMedia
    : community.aboutMedia || [];
  const banner = media.find((item) => item.mediaType !== 'video');
  return banner ? resolveMediaUrl(banner.url) || banner.url : '';
}

function avatarCoverSrc(community: Community) {
  if (community.avatarStyle === 'uploaded' && community.avatarUrl) {
    return resolveMediaUrl(community.avatarUrl);
  }
  if (community.avatarUrl && community.avatarStyle !== 'emoji') {
    return resolveMediaUrl(community.avatarUrl);
  }
  if (community.avatarSeed) {
    return buildDiceBearAvatarUrl(
      community.avatarSeed || community.name || 'community',
      community.avatarStyle &&
        community.avatarStyle !== 'uploaded' &&
        community.avatarStyle !== 'emoji'
        ? community.avatarStyle
        : COMMUNITY_AVATAR_STYLE,
      512
    );
  }
  return '';
}

interface CommunityJoinPreviewProps {
  community: Community;
  overview?: CommunityDiscoverOverview;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  pending?: boolean;
}

export function CommunityJoinPreview({
  community,
  overview,
  headerLeft,
  headerRight,
  pending = false,
}: CommunityJoinPreviewProps) {
  const activities =
    overview?.activitiesTracked?.length
      ? overview.activitiesTracked
      : community.activities.map((activity) => ({
          id: activity.id,
          name: activity.name,
          unit: activity.baseUnit || '',
        }));

  const photoBanner = aboutBannerSrc(community, overview);
  const fallbackCover = avatarCoverSrc(community);
  const bannerSrc = photoBanner || fallbackCover;
  const blurCover = Boolean(!photoBanner && fallbackCover);
  const memberCount = overview?.memberCount ?? community.memberCount;
  const watermark =
    (community.icon && community.icon.trim()) || community.name.trim().slice(0, 1).toUpperCase();

  return (
    <div className="-mx-4 sm:-mx-6">
      <div className="relative">
        <div className="relative h-[calc(12.5rem+env(safe-area-inset-top,0px))] overflow-hidden bg-gradient-to-br from-[#EA580C] via-[#E8A838] to-[#6CBC5A] sm:h-[calc(14.5rem+env(safe-area-inset-top,0px))]">
          {bannerSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerSrc}
              alt=""
              className={
                blurCover
                  ? 'h-full w-full scale-125 object-cover blur-xl brightness-90'
                  : 'h-full w-full object-cover'
              }
            />
          ) : (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8rem] leading-none opacity-25">
              {watermark}
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/25" />
        </div>

        {(headerLeft || headerRight) && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-[max(0.45rem,env(safe-area-inset-top,0px))]">
            <div className="rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md [&_a]:text-white [&_a]:hover:text-white [&_button]:text-white [&_button]:hover:text-white">
              {headerLeft}
            </div>
            {headerRight ? (
              <div className="rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md [&_button]:text-white [&_button]:hover:text-white">
                {headerRight}
              </div>
            ) : (
              <span />
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-1/2 z-10 -mb-14 -translate-x-1/2">
          <CommunityAvatar
            name={community.name}
            icon={community.icon}
            avatarUrl={community.avatarUrl}
            avatarSeed={community.avatarSeed}
            avatarStyle={community.avatarStyle}
            size="2xl"
            className="!rounded-full border-[5px] border-background shadow-[var(--shadow-float)]"
          />
        </div>
      </div>

      <div className="px-4 pb-1 pt-16 text-center sm:px-6">
        <h1 className="font-serif text-2xl font-semibold leading-tight text-foreground">
          {community.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
          {' · '}
          {communityTypeLabel(community.type)}
        </p>

        {pending ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <Users className="h-3.5 w-3.5" />
            Request pending
          </p>
        ) : null}

        {activities.length ? (
          <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
            {activities.slice(0, 6).map((activity, index) => (
              <li
                key={activity.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground"
              >
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length] }}
                >
                  {activity.name.slice(0, 1).toUpperCase()}
                </span>
                {activity.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
