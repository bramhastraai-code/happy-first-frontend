'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, X } from 'lucide-react';
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
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
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
    <div className="fixed inset-0 z-[220] bg-black">
      {/* Full-bleed camera */}
      <div
        id="community-qr-reader"
        className={cn(
          'absolute inset-0',
          '[&_video]:absolute [&_video]:inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover',
          '[&_img]:hidden',
          '[&_#qr-shaded-region]:border-0'
        )}
      />

      {/* Dim outside the scan area */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/45"
        style={{
          maskImage:
            'radial-gradient(circle 120px at center, transparent 119px, black 120px)',
          WebkitMaskImage:
            'radial-gradient(circle 120px at center, transparent 119px, black 120px)',
        }}
      />

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pt-2">
          <p className="text-base font-semibold text-white">Scan QR</p>
          <p className="mt-0.5 text-xs text-white/70">Community invite</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white"
          aria-label="Close scanner"
        >
          <X className="h-6 w-6" strokeWidth={2} />
        </button>
      </div>

      {/* Square viewfinder */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative h-60 w-60">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-[3px] border-t-[3px] border-white" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-[3px] border-t-[3px] border-white" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-white" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-white" />
          <span className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-primary/80" />
        </div>
      </div>
    </div>
  );
}
