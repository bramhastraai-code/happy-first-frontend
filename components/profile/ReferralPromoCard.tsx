'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authAPI } from '@/lib/api/auth';
import { cn } from '@/lib/utils';
import { Check, Share2, UserPlus } from 'lucide-react';
import {
  copyReferralLink,
  nativeShareReferral,
  referralInviteUrl,
} from '@/lib/utils/referralShare';

interface ReferralPromoCardProps {
  className?: string;
}

export default function ReferralPromoCard({ className }: ReferralPromoCardProps) {
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    authAPI
      .userInfo()
      .then((res) => setReferralCode(res.data.data.referralCode ?? ''))
      .catch((error) => {
        console.error('Error fetching referral code:', error);
      });
  }, []);

  const referralLink = referralCode ? referralInviteUrl(referralCode) : '';

  const handleShare = async () => {
    if (!referralLink) return;
    const shared = await nativeShareReferral(referralLink);
    if (shared) return;
    await copyReferralLink(referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <Link
        href="/referral"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#dbdbdb] bg-[#efefef] text-sm font-semibold text-foreground transition-colors hover:bg-[#dbdbdb]"
      >
        <UserPlus className="h-4 w-4" />
        Invite
      </Link>
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={!referralLink}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-none border border-[#dbdbdb] bg-[#efefef] text-sm font-semibold text-foreground transition-colors hover:bg-[#dbdbdb] disabled:opacity-50"
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Copied' : 'Share'}
      </button>
    </div>
  );
}
