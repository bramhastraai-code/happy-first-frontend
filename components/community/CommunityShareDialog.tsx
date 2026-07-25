'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="fixed inset-0 z-[220] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl'
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Share community</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{communityName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-xl bg-secondary/60 p-4">
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrSrc}
              alt={`QR code to join ${communityName}`}
              className="h-[220px] w-[220px] rounded-lg bg-white p-2"
            />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            Scan this QR to open join link
          </p>
        </div>

        <p className="mt-3 break-all rounded-xl border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
          {joinUrl}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="w-full" onClick={() => void copyLink()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button className="w-full" onClick={() => void shareNative()}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
