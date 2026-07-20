'use client';

interface LogSuccessOverlayProps {
  points: number;
  message?: string;
  redirectHint?: string;
}

/**
 * Full-screen green celebration shown after a successful daily / previous-day log.
 */
export default function LogSuccessOverlay({
  points,
  message = "You've successfully logged your activities!",
  redirectHint = 'Redirecting to home...',
}: LogSuccessOverlayProps) {
  const earned = Number(points) || 0;
  const hasPoints = earned > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 animate-fade-in">
      <div className="px-6 text-center animate-scale-up">
        <div className="mb-6 animate-bounce">
          <div className="inline-flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-2xl">
            <span className="text-7xl" aria-hidden>
              🏆
            </span>
          </div>
        </div>

        <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
          Congratulations!
        </h1>
        <p className="mb-6 text-xl text-white/90 sm:text-2xl">
          {hasPoints
            ? message
            : 'Your log was saved, but no points were earned for the values submitted.'}
        </p>

        <div className="mb-8 inline-block rounded-2xl bg-white px-8 py-6 shadow-2xl">
          <p className="mb-2 text-sm font-medium text-slate-600">Points Earned</p>
          <p
            className={`text-5xl font-bold tabular-nums ${
              hasPoints ? 'text-green-600' : 'text-slate-500'
            }`}
          >
            +{earned.toFixed(2)}
          </p>
        </div>

        <div className="mb-6 flex justify-center gap-4 text-4xl animate-pulse" aria-hidden>
          <span>⭐</span>
          <span>🎉</span>
          <span>✨</span>
          <span>🎊</span>
          <span>⭐</span>
        </div>

        <p className="text-sm text-white/80">{redirectHint}</p>
      </div>
    </div>
  );
}
