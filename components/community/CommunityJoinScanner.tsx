'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCommunityJoinPath, parseCommunityIdFromQrText } from '@/lib/community/share';

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
          { fps: 8, qrbox: { width: 240, height: 240 } },
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
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Scan to join</p>
            <p className="text-[11px] text-muted-foreground">Point at a community invite QR</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative bg-black p-3">
          <div id="community-qr-reader" className="overflow-hidden rounded-xl" />
          {starting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="px-4 py-3 text-center text-xs text-destructive">{error}</p>
        ) : (
          <p className="px-4 py-3 text-center text-xs text-muted-foreground">
            Allow camera access to scan
          </p>
        )}

        <div className="border-t border-border p-3">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
