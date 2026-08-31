'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { getCommunityJoinPath, parseCommunityIdFromQrText } from '@/lib/community/share';
import { cn } from '@/lib/utils';

interface CommunityJoinScannerProps {
  open: boolean;
  onClose: () => void;
}

function cameraErrorMessage(err: unknown) {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Camera permission denied or unavailable';
  const text = raw.toLowerCase();
  if (text.includes('notallowed') || text.includes('permission') || text.includes('denied')) {
    return 'Camera access is blocked. Allow camera for this site and try again.';
  }
  if (text.includes('notfound') || text.includes('requested device not found')) {
    return 'No camera found on this device.';
  }
  if (text.includes('notreadable') || text.includes('trackstart') || text.includes('in use')) {
    return 'Camera is in use by another app. Close it and try again.';
  }
  if (text.includes('secure') || text.includes('https')) {
    return 'Camera needs a secure (HTTPS) connection.';
  }
  return raw;
}

async function pickCameraId(): Promise<string | { facingMode: { ideal: string } }> {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length === 0) {
      return { facingMode: { ideal: 'environment' } };
    }
    const back = [...cameras]
      .reverse()
      .find((cam) => /back|rear|environment|world/i.test(cam.label));
    return (back ?? cameras[cameras.length - 1]).id;
  } catch {
    return { facingMode: { ideal: 'environment' } };
  }
}

export function CommunityJoinScanner({ open, onClose }: CommunityJoinScannerProps) {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [fileScanning, setFileScanning] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let started = false;
    handledRef.current = false;
    setError(null);
    setStarting(true);

    const regionId = 'community-qr-reader';

    const stop = async (scanner: Html5Qrcode | null) => {
      if (!scanner) return;
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {
        // already stopped
      }
      try {
        scanner.clear();
      } catch {
        // ignore
      }
    };

    const handleDecoded = (scanner: Html5Qrcode, decoded: string) => {
      if (handledRef.current || cancelled) return;
      const communityId = parseCommunityIdFromQrText(decoded);
      if (!communityId) {
        setError('Not a community invite QR. Try a Happy First community QR.');
        return;
      }
      handledRef.current = true;
      void stop(scanner).then(() => {
        onClose();
        router.push(getCommunityJoinPath(communityId));
      });
    };

    const timer = window.setTimeout(() => {
      void (async () => {
        const el = document.getElementById(regionId);
        if (!el || cancelled) return;

        const scanner = new Html5Qrcode(regionId, {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scanner;

        const size = Math.max(
          160,
          Math.min(260, Math.floor(Math.min(el.clientWidth, el.clientHeight) * 0.62))
        );
        const config = {
          fps: 12,
          qrbox: { width: size, height: size },
          disableFlip: false,
        };

        const startWith = async (camera: string | MediaTrackConstraints) => {
          await scanner.start(
            camera,
            config,
            (decoded) => handleDecoded(scanner, decoded),
            () => undefined
          );
        };

        try {
          const camera = await pickCameraId();
          try {
            await startWith(camera);
          } catch {
            try {
              if (scanner.isScanning) await scanner.stop();
            } catch {
              // reset then retry with generic rear-camera constraint
            }
            await startWith({ facingMode: 'environment' });
          }
          started = true;
          if (cancelled) {
            await stop(scanner);
            return;
          }
          setStarting(false);
        } catch (err) {
          if (cancelled) return;
          setStarting(false);
          setError(cameraErrorMessage(err));
        }
      })();
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (started || scanner) void stop(scanner);
    };
  }, [open, onClose, router]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const scanImageFile = async (file: File | undefined) => {
    if (!file) return;
    setFileScanning(true);
    setError(null);
    try {
      const scanner =
        scannerRef.current ?? new Html5Qrcode('community-qr-reader', { verbose: false });
      scannerRef.current = scanner;
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch {
          // continue with file scan
        }
      }
      const decoded = await scanner.scanFile(file, false);
      const communityId = parseCommunityIdFromQrText(decoded);
      if (!communityId) {
        setError('Not a community invite QR. Try a Happy First community QR.');
        return;
      }
      handledRef.current = true;
      onClose();
      router.push(getCommunityJoinPath(communityId));
    } catch {
      setError('Could not read a QR code from that image.');
    } finally {
      setFileScanning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black">
      <div
        id="community-qr-reader"
        className={cn(
          'absolute inset-0 overflow-hidden',
          '[&_video]:absolute [&_video]:inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover',
          '[&_img]:hidden',
          '[&_#qr-shaded-region]:hidden'
        )}
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="relative h-60 w-60 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
          <span className="absolute left-0 top-0 h-8 w-8 border-l-[3px] border-t-[3px] border-white" />
          <span className="absolute right-0 top-0 h-8 w-8 border-r-[3px] border-t-[3px] border-white" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-[3px] border-l-[3px] border-white" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-[3px] border-r-[3px] border-white" />
          <span className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-primary/80" />
        </div>
      </div>

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

      {(starting || fileScanning) && !error ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {error ? (
          <p className="mb-3 text-center text-sm font-medium text-red-200">{error}</p>
        ) : (
          <p className="mb-3 text-center text-xs text-white/70">
            Point your camera at a community QR
          </p>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={fileScanning}
          className="mx-auto flex items-center justify-center gap-2 text-sm font-semibold text-white"
        >
          <ImagePlus className="h-4 w-4" />
          Upload QR photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            void scanImageFile(file);
          }}
        />
      </div>
    </div>
  );
}
