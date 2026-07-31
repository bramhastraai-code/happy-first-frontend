/**
 * WhatsApp/Instagram-style text status cards.
 * Renders styled text onto a canvas so text-only posts/stories flow through
 * the existing image pipeline (feed cards, story viewer, thumbnails, reposts).
 */

export interface TextCardBackground {
  id: string;
  label: string;
  from: string;
  to: string;
}

export const TEXT_CARD_BACKGROUNDS: TextCardBackground[] = [
  { id: 'sunset', label: 'Sunset', from: '#f97316', to: '#dc2626' },
  { id: 'ocean', label: 'Ocean', from: '#0ea5e9', to: '#2563eb' },
  { id: 'grape', label: 'Grape', from: '#a855f7', to: '#6d28d9' },
  { id: 'rose', label: 'Rose', from: '#ec4899', to: '#be185d' },
  { id: 'forest', label: 'Forest', from: '#22c55e', to: '#15803d' },
  { id: 'candy', label: 'Candy', from: '#f472b6', to: '#fb923c' },
  { id: 'midnight', label: 'Midnight', from: '#312e81', to: '#0f172a' },
  { id: 'slate', label: 'Slate', from: '#475569', to: '#1e293b' },
];

export interface TextCardFont {
  id: string;
  label: string;
  /** Classes applied to the live textarea preview. */
  className: string;
  /** Canvas ctx.font string for a given pixel size. */
  canvasFont: (px: number) => string;
}

export const TEXT_CARD_FONTS: TextCardFont[] = [
  {
    id: 'clean',
    label: 'Clean',
    className: 'font-sans font-semibold',
    canvasFont: (px) => `600 ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`,
  },
  {
    id: 'serif',
    label: 'Serif',
    className: 'font-serif font-bold',
    canvasFont: (px) => `700 ${px}px Georgia, "Times New Roman", serif`,
  },
  {
    id: 'mono',
    label: 'Typewriter',
    className: 'font-mono',
    canvasFont: (px) => `${px}px "Courier New", Courier, monospace`,
  },
  {
    id: 'playful',
    label: 'Fun',
    className: 'font-bold [font-family:"Comic_Sans_MS","Chalkboard_SE",cursive]',
    canvasFont: (px) => `700 ${px}px "Comic Sans MS", "Chalkboard SE", cursive`,
  },
];

export function textCardGradient(background: TextCardBackground): string {
  return `linear-gradient(135deg, ${background.from}, ${background.to})`;
}

export const TEXT_CARD_MAX_LENGTH = 700;

/** Wrap text to fit maxWidth, breaking very long words by characters. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }

    let line = '';
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word;
      if (ctx.measureText(attempt).width <= maxWidth) {
        line = attempt;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      // Word alone is wider than the card — break it by characters.
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = '';
        for (const char of word) {
          if (ctx.measureText(chunk + char).width <= maxWidth) {
            chunk += char;
          } else {
            if (chunk) lines.push(chunk);
            chunk = char;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

export interface RenderTextCardOptions {
  text: string;
  background: TextCardBackground;
  font: TextCardFont;
  /** post → 4:5 (1080×1350), story → 9:16 (1080×1920) */
  kind: 'post' | 'story';
}

export async function renderTextCardImage({
  text,
  background,
  font,
  kind,
}: RenderTextCardOptions): Promise<Blob> {
  const width = 1080;
  const height = kind === 'story' ? 1920 : 1350;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, background.from);
  gradient.addColorStop(1, background.to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const maxTextWidth = width - 200;
  const maxTextHeight = height - 320;
  const content = text.trim();

  // Auto-size: start big, shrink until the wrapped block fits vertically.
  let fontSize = 44;
  let lines: string[] = [];
  for (let size = 112; size >= 44; size -= 4) {
    ctx.font = font.canvasFont(size);
    const wrapped = wrapText(ctx, content, maxTextWidth);
    if (wrapped.length * size * 1.3 <= maxTextHeight || size === 44) {
      fontSize = size;
      lines = wrapped;
      if (wrapped.length * size * 1.3 <= maxTextHeight) break;
    }
  }

  const lineHeight = fontSize * 1.3;
  ctx.font = font.canvasFont(fontSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not create the text card image'));
      },
      'image/jpeg',
      0.92
    );
  });
}
