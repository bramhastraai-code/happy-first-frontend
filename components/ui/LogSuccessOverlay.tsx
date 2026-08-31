'use client';

import { Flame, Sparkles } from 'lucide-react';

interface LogSuccessOverlayProps {
  points: number;
  message?: string;
  entries?: Array<{ label: string; value: string }>;
}

/**
 * Full-screen celebration after a successful daily / previous-day log.
 * Colours follow the profile mascot theme.
 */
export default function LogSuccessOverlay({
  points,
  message = "You've successfully logged your activities!",
  entries = [],
}: LogSuccessOverlayProps) {
  const earned = Number(points) || 0;
  const hasPoints = earned > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden animate-fade-in">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 20%, var(--color-primary-soft) 0%, transparent 55%), linear-gradient(160deg, var(--color-primary) 0%, var(--color-primary-hover) 48%, var(--color-accent-foreground) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 78%, rgb(255 255 255 / 0.35) 0%, transparent 28%), radial-gradient(circle at 86% 22%, rgb(255 255 255 / 0.4) 0%, transparent 32%)',
        }}
      />

      <div className="relative z-10 mx-4 w-full max-w-sm animate-scale-in px-2 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-[var(--shadow-float)] ring-4 ring-white/25">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Flame className="h-7 w-7 fill-primary stroke-[2.5]" aria-hidden />
          </span>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
          Logged
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Nice work
        </h1>
        <p className="mx-auto mb-6 max-w-xs text-base leading-relaxed text-white/90 sm:text-lg">
          {hasPoints
            ? message
            : 'Your log was saved, but no points were earned for the values submitted.'}
        </p>

        {entries.length > 0 ? (
          <ul className="mb-5 max-h-36 overflow-y-auto rounded-2xl border border-white/20 bg-white/15 px-3 py-2 text-left backdrop-blur-sm">
            {entries.map((entry) => (
              <li
                key={`${entry.label}-${entry.value}`}
                className="flex items-center justify-between gap-3 py-1.5 text-sm text-white"
              >
                <span className="truncate font-medium">{entry.label}</span>
                <span className="shrink-0 tabular-nums font-semibold">{entry.value}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/95 p-5 shadow-[var(--shadow-float)] backdrop-blur-sm">
          <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            Percentage earned (%)
          </div>
          <p
            className={`text-4xl font-bold tabular-nums tracking-tight sm:text-5xl ${
              hasPoints ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            +{earned.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
