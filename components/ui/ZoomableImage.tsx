'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Extra class on the wrapping stage (fill parent, round corners, etc.) */
  stageClassName?: string;
}

function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Pinch / wheel zoom + pan for full-page photo viewers.
 * Double-tap (or double-click) toggles 1x / 2.5x.
 */
export function ZoomableImage({
  src,
  alt,
  className,
  stageClassName,
}: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTap = useRef(0);
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const originRef = useRef({ tx, ty });
  originRef.current = { tx, ty };

  const clampScale = (value: number) => Math.min(4, Math.max(1, value));

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const onPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const now = Date.now();
    if (event.pointerType !== 'touch' && now - lastTap.current < 280) {
      if (scaleRef.current > 1) reset();
      else setScale(2.5);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: pointerDistance(a, b), scale: scaleRef.current };
      pan.current = null;
    } else if (scaleRef.current > 1) {
      pan.current = {
        x: event.clientX,
        y: event.clientY,
        tx: originRef.current.tx,
        ty: originRef.current.ty,
      };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = pointerDistance(a, b);
      if (pinch.current.dist > 0) {
        setScale(clampScale((dist / pinch.current.dist) * pinch.current.scale));
      }
      return;
    }

    if (pan.current && scaleRef.current > 1) {
      setTx(pan.current.tx + (event.clientX - pan.current.x));
      setTy(pan.current.ty + (event.clientY - pan.current.y));
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) pan.current = null;
  };

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const next = clampScale(scaleRef.current * (event.deltaY < 0 ? 1.12 : 0.9));
    setScale(next);
    if (next <= 1) {
      setTx(0);
      setTy(0);
    }
  };

  const onDoubleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    if (scaleRef.current > 1) reset();
    else setScale(2.5);
  };

  return (
    <div
      className={cn(
        'relative flex max-h-full max-w-full touch-none items-center justify-center overflow-hidden',
        stageClassName
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn('max-h-full max-w-full select-none object-contain', className)}
        style={{
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          transformOrigin: 'center center',
          transition: pointers.current.size ? 'none' : 'transform 120ms ease-out',
        }}
      />
    </div>
  );
}
