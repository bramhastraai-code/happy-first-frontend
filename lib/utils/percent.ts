/** Clamp a percentage into [0, max] (default max 100). */
export function clampPercent(value: number, max = 100): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(max, n);
}

/**
 * Convert numerator/denominator to a percentage capped at `max` (default 100).
 * Use for progress UI — overachievement must not display above 100%.
 */
export function ratioToPercent(
  numerator: number,
  denominator: number,
  options?: { round?: boolean; max?: number }
): number {
  const den = Number(denominator);
  if (!Number.isFinite(den) || den <= 0) return 0;
  const raw = ((Number(numerator) || 0) / den) * 100;
  const capped = clampPercent(raw, options?.max ?? 100);
  return options?.round === false ? capped : Math.round(capped);
}
