'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, ScanLine, X } from 'lucide-react';
import { getCommunityJoinPath, parseCommunityIdFromQrText } from '@/lib/community/share';
import { cn } from '@/lib/utils';

interface CommunityJoinScannerProps {
  open: boolean;
  onClose: () => void;
}

export function CommunityJoinScanner({ open, onClose }: CommunityJoinScannerProps) {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    handledRef.current = false;
    setError(null);
    setStarting(true);

    const scanner = new Html5Qrcode('community-qr-reader');
    scannerRef.current = scanner;

    const stop = async () => {
      try {
        if (scanner.isScanning) await scanner.stop();
        scanner.clear();
      } catch {
        // ignore stop errors
      }
    };

    void (async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          (decoded) => {
            if (handledRef.current || cancelled) return;
            const communityId = parseCommunityIdFromQrText(decoded);
            if (!communityId) {
              setError('Not a community invite QR. Try again.');
              return;
            }
            handledRef.current = true;
            void stop().then(() => {
              onClose();
              router.push(getCommunityJoinPath(communityId));
            });
          },
          () => {
            // ignore frame scan misses
          }
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (!cancelled) {
          setStarting(false);
          setError(
            err instanceof Error
              ? err.message
              : 'Camera permission denied or unavailable'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      void stop();
      scannerRef.current = null;
    };
  }, [open, onClose, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex flex-col bg-[#0b1220]">
      {/* Soft ambient washes — Google Pay–style depth without heavy glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-primary/35 blur-3xl" />
        <div className="absolute -right-10 bottom-24 h-64 w-64 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />
      </div>

      {/* Glass top bar */}
      <div className="relative z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-[1.35rem] px-3.5 py-3',
            'border border-white/25 bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.22)]',
            'backdrop-blur-2xl backdrop-saturate-150'
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-white">
              <ScanLine className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold tracking-tight text-white">
                Scan to join
              </p>
              <p className="truncate text-[11px] text-white/70">
                Point at a community invite QR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Camera stage */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-6">
        <div className="relative w-full max-w-sm">
          <div
            className={cn(
              'relative overflow-hidden rounded-[1.75rem] border border-white/30',
              'bg-black/40 shadow-[0_20px_60px_rgba(0,0,0,0.45)]',
              'backdrop-blur-md'
            )}
          >
            <div
              id="community-qr-reader"
              className={cn(
                'min-h-[320px] overflow-hidden',
                '[&_video]:h-full [&_video]:w-full [&_video]:object-cover',
                '[&_img]:hidden [&_#qr-shaded-region]:border-transparent'
              )}
            />

            {/* Soft viewfinder accent over camera */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-[250px] w-[250px]">
                <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-[1.1rem] border-l-[3px] border-t-[3px] border-white/95" />
                <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-[1.1rem] border-r-[3px] border-t-[3px] border-white/95" />
                <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-[1.1rem] border-b-[3px] border-l-[3px] border-white/95" />
                <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-[1.1rem] border-b-[3px] border-r-[3px] border-white/95" />
              </div>
            </div>

            {starting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <p className="text-xs font-medium text-white/80">Starting camera…</p>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <div
            className={cn(
              'mt-5 max-w-sm rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-center',
              'backdrop-blur-xl'
            )}
          >
            <p className="text-xs font-medium text-red-200">{error}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
