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

type DetectedBarcode = { rawValue?: string };

type BarcodeDetectorLike = {
  detect: (
    source: CanvasImageSource | ImageBitmap
  ) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

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
  if (text.includes('timed out')) {
    return 'Camera started but the video feed did not load. Try again.';
  }
  return raw;
}

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

async function createQrDetector(): Promise<BarcodeDetectorLike | null> {
  const Detector = getBarcodeDetectorCtor();
  if (!Detector) return null;
  try {
    const formats = Detector.getSupportedFormats ? await Detector.getSupportedFormats() : ['qr_code'];
    const qrFormats = formats.filter((format) => /qr/i.test(format));
    return new Detector({ formats: qrFormats.length ? qrFormats : ['qr_code'] });
  } catch {
    try {
      return new Detector({ formats: ['qr_code'] });
    } catch {
      return null;
    }
  }
}

async function openCameraStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    { audio: false, video: { facingMode: 'environment' } },
    { audio: false, video: true },
  ];
  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Camera permission denied or unavailable');
}

async function waitForVideo(video: HTMLVideoElement, signal: { cancelled: boolean }) {
  if (video.readyState >= 2 && video.videoWidth > 0) return;
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      if (video.videoWidth <= 0) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Camera timed out'));
    }, 8000);
    video.addEventListener('loadeddata', finish);
    video.addEventListener('playing', finish);
    video.addEventListener('loadedmetadata', finish);
    void video.play().then(finish).catch(() => undefined);
    if (video.readyState >= 2 && video.videoWidth > 0) finish();
    const poll = window.setInterval(() => {
      if (signal.cancelled) {
        window.clearInterval(poll);
        if (!settled) {
          settled = true;
          window.clearTimeout(timeout);
          reject(new Error('cancelled'));
        }
        return;
      }
      if (video.readyState >= 2 && video.videoWidth > 0) {
        window.clearInterval(poll);
        finish();
      }
    }, 80);
  });
}

async function decodeWithDetector(
  detector: BarcodeDetectorLike,
  source: CanvasImageSource | ImageBitmap
): Promise<string | null> {
  try {
    const codes = await detector.detect(source);
    const text = codes.find((code) => code.rawValue)?.rawValue;
    return text ? String(text).trim() : null;
  } catch {
    return null;
  }
}

async function decodeFileWithHtml5(file: File, elementId: string): Promise<string | null> {
  const host = document.getElementById(elementId);
  if (!host) return null;
  host.innerHTML = '';
  const scanner = new Html5Qrcode(elementId, { verbose: false });
  try {
    const decoded = await scanner.scanFile(file, false);
    return decoded ? String(decoded).trim() : null;
  } catch {
    return null;
  } finally {
    try {
      scanner.clear();
    } catch {
      // ignore
    }
    host.innerHTML = '';
  }
}

async function canvasToFile(canvas: HTMLCanvasElement): Promise<File | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), 'image/jpeg', 0.92);
  });
  if (!blob) return null;
  return new File([blob], 'frame.jpg', { type: 'image/jpeg' });
}

export function CommunityJoinScanner({ open, onClose }: CommunityJoinScannerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const routerRef = useRef(router);
  const handledRef = useRef(false);
  const html5BusyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [fileScanning, setFileScanning] = useState(false);

  onCloseRef.current = onClose;
  routerRef.current = router;

  useEffect(() => {
    if (!open) return;

    const signal = { cancelled: false };
    handledRef.current = false;
    setError(null);
    setStarting(true);

    const stopStream = (stream: MediaStream | null) => {
      stream?.getTracks().forEach((track) => track.stop());
    };

    const completeJoin = (decoded: string) => {
      if (handledRef.current || signal.cancelled) return false;
      const communityId = parseCommunityIdFromQrText(decoded);
      if (!communityId) {
        setError('Not a community invite QR. Try a Happy First community QR.');
        return false;
      }
      handledRef.current = true;
      onCloseRef.current();
      routerRef.current.push(getCommunityJoinPath(communityId));
      return true;
    };

    void (async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      let stream: MediaStream | null = null;
      try {
        stream = await openCameraStream();
        if (signal.cancelled) {
          stopStream(stream);
          return;
        }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        try {
          await waitForVideo(video, signal);
        } catch (err) {
          if (signal.cancelled) return;
          throw err;
        }
        if (signal.cancelled) return;

        try {
          const track = stream.getVideoTracks()[0];
          await track?.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
          });
        } catch {
          // focus mode is optional
        }

        setStarting(false);

        const detector = await createQrDetector();
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setError('Could not start the scanner on this device.');
          return;
        }

        const scanFrame = async () => {
          if (signal.cancelled || handledRef.current) return;
          if (video.readyState < 2 || video.videoWidth <= 0) return;

          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (detector) {
            let source: CanvasImageSource | ImageBitmap = canvas;
            let bitmap: ImageBitmap | null = null;
            try {
              bitmap = await createImageBitmap(canvas);
              source = bitmap;
            } catch {
              // canvas detect still works on most browsers
            }
            const decoded = await decodeWithDetector(detector, source);
            bitmap?.close();
            if (decoded && completeJoin(decoded)) return;
          } else if (!html5BusyRef.current) {
            html5BusyRef.current = true;
            try {
              const file = await canvasToFile(canvas);
              if (file) {
                const decoded = await decodeFileWithHtml5(file, 'community-qr-decode');
                if (decoded && completeJoin(decoded)) return;
              }
            } finally {
              html5BusyRef.current = false;
            }
          }
        };

        const loop = async () => {
          if (signal.cancelled || handledRef.current) return;
          try {
            await scanFrame();
          } catch {
            // keep trying the next frame
          }
          if (!signal.cancelled && !handledRef.current) {
            window.setTimeout(() => void loop(), detector ? 80 : 220);
          }
        };

        void loop();
      } catch (err) {
        if (signal.cancelled) return;
        stopStream(stream);
        setStarting(false);
        setError(cameraErrorMessage(err));
      }
    })();

    return () => {
      signal.cancelled = true;
      const video = videoRef.current;
      const media = video?.srcObject;
      if (media instanceof MediaStream) {
        stopStream(media);
      }
      if (video) {
        video.srcObject = null;
      }
    };
  }, [open]);

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
      const detector = await createQrDetector();
      let decoded: string | null = null;
      if (detector) {
        const bitmap = await createImageBitmap(file);
        try {
          decoded = await decodeWithDetector(detector, bitmap);
        } finally {
          bitmap.close();
        }
      }
      if (!decoded) {
        decoded = await decodeFileWithHtml5(file, 'community-qr-decode');
      }
      if (!decoded) {
        setError('Could not read a QR code from that image.');
        return;
      }
      const communityId = parseCommunityIdFromQrText(decoded);
      if (!communityId) {
        setError('Not a community invite QR. Try a Happy First community QR.');
        return;
      }
      handledRef.current = true;
      const video = videoRef.current;
      const media = video?.srcObject;
      if (media instanceof MediaStream) {
        media.getTracks().forEach((track) => track.stop());
      }
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
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        playsInline
        controls={false}
      />
      <canvas ref={canvasRef} className="hidden" />
      <div id="community-qr-decode" className="hidden" />

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
