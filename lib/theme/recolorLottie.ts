import { normalizeMascotColor } from '@/lib/theme/mascotTheme';

function hexToLottieRgba(hex: string): [number, number, number, number] {
  const h = normalizeMascotColor(hex).slice(1);
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ];
}

function isColorTuple(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.length <= 4 &&
    value.every((item) => typeof item === 'number')
  );
}

function isNearGray(r: number, g: number, b: number) {
  return Math.max(r, g, b) - Math.min(r, g, b) < 0.08;
}

function tintColor(source: number[], theme: [number, number, number, number]) {
  const [r, g, b, a = 1] = source;
  if (isNearGray(r, g, b)) return source;
  return [theme[0], theme[1], theme[2], a];
}

function recolorNode(node: unknown, theme: [number, number, number, number]): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    node.forEach((item) => recolorNode(item, theme));
    return;
  }

  const obj = node as Record<string, unknown>;

  if (typeof obj.sc === 'string' && /^#([0-9a-f]{6})$/i.test(obj.sc)) {
    const [r, g, b] = hexToLottieRgba(obj.sc);
    if (!isNearGray(r, g, b)) {
      obj.sc = normalizeMascotColor(
        `#${[theme[0], theme[1], theme[2]]
          .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
          .join('')}`
      );
    }
  }

  const color = obj.c;
  if (color && typeof color === 'object' && color !== null && 'k' in color) {
    const slot = color as { a?: number; k: unknown };
    if (isColorTuple(slot.k)) {
      slot.k = tintColor(slot.k, theme);
    } else if (Array.isArray(slot.k)) {
      slot.k.forEach((frame) => {
        if (frame && typeof frame === 'object' && isColorTuple((frame as { s?: unknown }).s)) {
          const keyed = frame as { s: number[] };
          keyed.s = tintColor(keyed.s, theme);
        }
      });
    }
  }

  Object.values(obj).forEach((value) => recolorNode(value, theme));
}

/** Clone a Lottie JSON and retint chromatic fills/strokes to the theme colour. */
export function recolorLottie(animationData: unknown, hex: string): object {
  const cloned = JSON.parse(JSON.stringify(animationData)) as object;
  recolorNode(cloned, hexToLottieRgba(hex));
  return cloned;
}
