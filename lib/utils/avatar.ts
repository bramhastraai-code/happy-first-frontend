/** DiceBear Adventurer avatar helpers (no npm package — uses public API). */

import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';

export const AVATAR_STYLE = 'adventurer' as const;

/**
 * Keep generated Happy First faces cheerful — never a sad/frown mouth.
 * DiceBear 9.x adventurer uses `mouth` (not mouthVariant).
 */
const HAPPY_MOUTH_VARIANTS = [
  'variant01',
  'variant02',
  'variant03',
  'variant06',
  'variant07',
  'variant10',
  'variant12',
  'variant18',
  'variant20',
  'variant23',
].join(',');

/** Soft/neutral brows — avoid angry furrowed looks. */
const HAPPY_EYEBROW_VARIANTS = [
  'variant01',
  'variant02',
  'variant03',
  'variant04',
  'variant05',
  'variant08',
  'variant10',
].join(',');

/** Curated seeds for the WhatsApp-style avatar gallery. */
export const AVATAR_GALLERY_SEEDS = [
  'happy',
  'explorer',
  'sunny',
  'brave',
  'calm',
  'spark',
  'ocean',
  'forest',
  'nova',
  'pixel',
  'luna',
  'zen',
  'maple',
  'comet',
  'river',
  'bloom',
  'echo',
  'glow',
  'quest',
  'ember',
  'willow',
  'orbit',
  'pearl',
  'flint',
] as const;

export function buildDiceBearAvatarUrl(
  seed: string,
  style: string = AVATAR_STYLE,
  size = 128
): string {
  const trimmedSeed = seed.trim() || 'happy';
  const trimmedStyle = style.trim() || AVATAR_STYLE;
  const safeStyle = encodeURIComponent(trimmedStyle);
  const params = new URLSearchParams({
    seed: trimmedSeed,
    size: String(size),
  });

  // Adventurer (and neutral): pin expression to happy mouths / soft brows
  if (trimmedStyle === 'adventurer' || trimmedStyle === 'adventurer-neutral') {
    params.set('mouth', HAPPY_MOUTH_VARIANTS);
    params.set('eyebrows', HAPPY_EYEBROW_VARIANTS);
    params.set('features', 'blush');
    params.set('featuresProbability', '60');
  }

  return `https://api.dicebear.com/9.x/${safeStyle}/svg?${params.toString()}`;
}

/** Site brand files — never use these as a person's profile photo. */
export function isBrandAssetAvatarUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const path = url.startsWith('http://') || url.startsWith('https://')
      ? new URL(url).pathname
      : url.split('?')[0];
    return (
      path === '/logo.png' ||
      path === '/logo-dark.png' ||
      path === '/icon' ||
      path === '/icon.png' ||
      path === '/apple-icon' ||
      path === '/apple-icon.png' ||
      path === '/favicon.ico' ||
      path.startsWith('/icons/') ||
      path.startsWith('/brand/')
    );
  } catch {
    return false;
  }
}

export function resolveProfileAvatarUrl(profile?: {
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  name?: string;
  _id?: string;
} | null): string | null {
  if (!profile) return null;
  const uploaded = profile.avatarUrl?.trim();
  if (uploaded && !isBrandAssetAvatarUrl(uploaded)) {
    return resolveMediaUrl(uploaded);
  }
  if (profile.avatarSeed) {
    return buildDiceBearAvatarUrl(
      profile.avatarSeed,
      profile.avatarStyle && profile.avatarStyle !== 'uploaded'
        ? profile.avatarStyle
        : AVATAR_STYLE
    );
  }
  // Fallback mascot seed — always cheerful
  if (profile.name || profile._id) {
    return buildDiceBearAvatarUrl(profile.name || profile._id || 'happy', AVATAR_STYLE);
  }
  return null;
}

export function randomAvatarSeed(prefix = 'hf'): string {
  const happyBases = ['happy', 'sunny', 'bloom', 'glow', 'spark', 'calm'];
  const base = happyBases[Math.floor(Math.random() * happyBases.length)];
  return `${base}-${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isUploadedAvatarUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.includes('api.dicebear.com')) return false;
  if (isBrandAssetAvatarUrl(url)) return false;
  return true;
}

export function hasUploadedProfileAvatar(
  avatarUrl?: string | null,
  avatarStyle?: string | null
): boolean {
  return avatarStyle === 'uploaded' || isUploadedAvatarUrl(avatarUrl);
}
