'use client';

import { useMemo } from 'react';
import Lottie from 'lottie-react';
import loaderAnimation from '@/public/lottie/loader.json';
import { cn } from '@/lib/utils';
import { useMascotThemeColor } from '@/lib/hooks/useMascotThemeColor';
import { recolorLottie } from '@/lib/theme/recolorLottie';

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
  const themeColor = useMascotThemeColor();
  const animationData = useMemo(
    () => recolorLottie(loaderAnimation, themeColor),
    [themeColor]
  );

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
        key={themeColor}
        animationData={animationData}
        loop
        style={{ width: size, height: size }}
      />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
