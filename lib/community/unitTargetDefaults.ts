import type { CommunityActivityLevel } from '@/lib/api/community';

/** Mirror of backend fallbackTargetByUnit — used to prefill custom activity targets. */
const UNIT_TABLE: Record<string, Record<CommunityActivityLevel, number>> = {
  steps: { beginner: 56000, active: 84000, champion: 140000 },
  km: { beginner: 14, active: 35, champion: 70 },
  days: { beginner: 2, active: 4, champion: 6 },
  mins: { beginner: 70, active: 140, champion: 210 },
  minutes: { beginner: 70, active: 140, champion: 210 },
  hrs: { beginner: 49, active: 56, champion: 56 },
  hours: { beginner: 49, active: 56, champion: 56 },
  l: { beginner: 14, active: 21, champion: 24.5 },
  floors: { beginner: 35, active: 105, champion: 175 },
  sessions: { beginner: 2, active: 4, champion: 6 },
  count: { beginner: 10, active: 20, champion: 30 },
};

const FALLBACK = { beginner: 10, active: 20, champion: 30 };

export function unitTargetDefaults(baseUnit: string): Record<CommunityActivityLevel, number> {
  const key = String(baseUnit || '').trim().toLowerCase();
  return UNIT_TABLE[key] || FALLBACK;
}

export type LevelTargetsDraft = Record<CommunityActivityLevel, string>;

export function emptyLevelTargets(): LevelTargetsDraft {
  return { beginner: '', active: '', champion: '' };
}

export function levelTargetsFromUnit(baseUnit: string): LevelTargetsDraft {
  const row = unitTargetDefaults(baseUnit);
  return {
    beginner: String(row.beginner),
    active: String(row.active),
    champion: String(row.champion),
  };
}

export function parseLevelTargetsPayload(
  draft: LevelTargetsDraft,
  baseUnit: string
): Record<CommunityActivityLevel, number> {
  const defaults = unitTargetDefaults(baseUnit);
  const out = {} as Record<CommunityActivityLevel, number>;
  (['beginner', 'active', 'champion'] as const).forEach((level) => {
    const raw = draft[level].trim();
    const n = raw ? Number(raw) : defaults[level];
    out[level] = Number.isFinite(n) && n > 0 ? n : defaults[level];
  });
  return out;
}
