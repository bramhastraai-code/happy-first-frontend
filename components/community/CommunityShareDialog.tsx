'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, QrCode, Share2, X } from 'lucide-react';
import { getCommunityJoinUrl } from '@/lib/community/share';
import { cn } from '@/lib/utils';

interface CommunityShareDialogProps {
  communityId: string;
  communityName: string;
  open: boolean;
  onClose: () => void;
}

export function CommunityShareDialog({
  communityId,
  communityName,
  open,
  onClose,
}: CommunityShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = useMemo(
    () => (open ? getCommunityJoinUrl(communityId) : ''),
    [open, communityId]
  );
  const qrSrc = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(joinUrl)}`
    : '';

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this invite link:', joinUrl);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: communityName,
          text: `Join ${communityName} on Happy First`,
          url: joinUrl,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    await copyLink();
  };

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-[#0b1220]/55 backdrop-blur-md"
        aria-label="Close"
        onClick={onClose}
      />

      {/* Ambient color behind the sheet */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[18%] h-48 w-48 -translate-x-1/2 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-[12%] right-[8%] h-40 w-40 rounded-full bg-sky-400/30 blur-3xl" />
      </div>

      <div
        className={cn(
          'relative z-10 w-full max-w-sm overflow-hidden rounded-[1.75rem]',
          'border border-white/40 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)]',
          'backdrop-blur-2xl backdrop-saturate-150'
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-primary/15 text-primary shadow-sm">
              <QrCode className="h-5 w-5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] font-semibold tracking-tight text-[#111827]">
                Share community
              </p>
              <p className="mt-0.5 truncate text-xs text-[#4b5563]">{communityName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/60 text-[#4b5563] transition hover:bg-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={cn(
            'flex flex-col items-center gap-3 rounded-[1.35rem] border border-white/70',
            'bg-gradient-to-b from-white/90 to-white/45 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
          )}
        >
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrSrc}
              alt={`QR code to join ${communityName}`}
              className="h-[200px] w-[200px] rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
            />
          ) : (
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-2xl bg-white/80">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <p className="text-center text-[11px] font-medium text-[#6b7280]">
            Scan this QR to open the join link
          </p>
        </div>

        <div
          className={cn(
            'mt-4 break-all rounded-2xl border border-white/70 bg-white/55 px-3.5 py-2.5',
            'text-[11px] leading-relaxed text-[#4b5563] backdrop-blur-md'
          )}
        >
          {joinUrl}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => void copyLink()}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/70',
              'bg-white/75 text-sm font-semibold text-[#111827] shadow-sm backdrop-blur-md',
              'transition hover:bg-white'
            )}
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => void shareNative()}
            className={cn(
              'inline-flex h-11 items-center justify-center gap-2 rounded-full',
              'bg-primary text-sm font-semibold text-primary-foreground',
              'shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition hover:opacity-95'
            )}
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
