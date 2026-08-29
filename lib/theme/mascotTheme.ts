/** Default brand orange — matches globals.css `--color-primary`. */
export const DEFAULT_MASCOT_COLOR = '#ea580c';

export const MASCOT_COLOR_PRESETS = [
  { label: 'Happy orange', value: '#ea580c' },
  { label: 'Sunny amber', value: '#d97706' },
  { label: 'Fresh green', value: '#16a34a' },
  { label: 'Sky blue', value: '#0284c7' },
  { label: 'Berry', value: '#db2777' },
  { label: 'Violet', value: '#7c3aed' },
] as const;

export const DEFAULT_LANDING_OPTIONS = [
  { value: '/home', label: 'Happiness (Home)' },
  { value: '/feed', label: 'Inspiration (Feed)' },
  { value: '/community', label: 'Community' },
  { value: '/tasks', label: 'Tasks' },
  { value: '/settings', label: 'Profile' },
] as const;

export type DefaultLandingPath =
  (typeof DEFAULT_LANDING_OPTIONS)[number]['value'];

export function normalizeMascotColor(input?: string | null): string {
  const raw = (input || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  return DEFAULT_MASCOT_COLOR;
}

export function resolveDefaultLanding(input?: string | null): DefaultLandingPath {
  const path = (input || '').trim();
  const match = DEFAULT_LANDING_OPTIONS.find((opt) => opt.value === path);
  return match?.value ?? '/home';
}

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeMascotColor(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => clampByte(v).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Darken for hover / pressed states. */
export function darkenHex(hex: string, amount = 0.18): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Soft tint for primary-soft / accent backgrounds. */
export function softTintHex(hex: string, mix = 0.88): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * mix,
    g + (255 - g) * mix,
    b + (255 - b) * mix
  );
}

/** Slightly deeper accent foreground on soft backgrounds. */
export function accentForegroundHex(hex: string): string {
  return darkenHex(hex, 0.35);
}

export function applyMascotTheme(color?: string | null) {
  if (typeof document === 'undefined') return;
  const primary = normalizeMascotColor(color);
  const hover = darkenHex(primary);
  const soft = softTintHex(primary);
  const accentFg = accentForegroundHex(primary);
  const root = document.documentElement;

  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-hover', hover);
  root.style.setProperty('--color-ring', primary);
  root.style.setProperty('--color-primary-soft', soft);
  root.style.setProperty('--color-accent', soft);
  root.style.setProperty('--color-accent-foreground', accentFg);
  // Aliases used by HappyFirstMascot SVG
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-soft', soft);
  root.style.setProperty('--shadow-float', `0 12px 40px ${primary}1f`);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', primary);
}

export function clearMascotTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  [
    '--color-primary',
    '--color-primary-hover',
    '--color-ring',
    '--color-primary-soft',
    '--color-accent',
    '--color-accent-foreground',
    '--primary',
    '--primary-soft',
    '--shadow-float',
  ].forEach((prop) => root.style.removeProperty(prop));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', DEFAULT_MASCOT_COLOR);
}
