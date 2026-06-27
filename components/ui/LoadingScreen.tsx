'use client';

import Lottie from 'lottie-react';
import loaderAnimation from '@/public/lottie/loader.json';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
  size?: number;
}

export default function LoadingScreen({
  label = 'Loading…',
  fullScreen = false,
  className,
  size = 96,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullScreen && 'min-h-[60vh]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Lottie
        animationData={loaderAnimation}
        loop
        style={{ width: size, height: size }}
      />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
