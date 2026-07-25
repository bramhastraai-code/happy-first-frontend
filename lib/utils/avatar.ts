/** DiceBear Adventurer avatar helpers (no npm package — uses public API). */

export const AVATAR_STYLE = 'adventurer' as const;

export function buildDiceBearAvatarUrl(
  seed: string,
  style: string = AVATAR_STYLE,
  size = 128
): string {
  const safeSeed = encodeURIComponent(seed.trim() || 'happy-first');
  const safeStyle = encodeURIComponent(style.trim() || AVATAR_STYLE);
  return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${safeSeed}&size=${size}`;
}

export function resolveProfileAvatarUrl(profile?: {
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  name?: string;
  _id?: string;
} | null): string | null {
  if (!profile) return null;
  if (profile.avatarUrl) return profile.avatarUrl;
  if (profile.avatarSeed) {
    return buildDiceBearAvatarUrl(
      profile.avatarSeed,
      profile.avatarStyle || AVATAR_STYLE
    );
  }
  return null;
}

export function randomAvatarSeed(prefix = 'hf'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
