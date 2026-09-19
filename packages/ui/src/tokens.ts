/**
 * Design tokens from docs/design/README.md and the mockups. Colours are the only source of truth for
 * the palette; tokens.css mirrors them as CSS variables for global styles.
 */
export const color = {
  /** Frost: the cool paper every screen sits on. */
  paper: '#F5F6FC',
  /** Midnight: text, primary buttons, the icon tile. */
  ink: '#0F0E1C',
  /** Iris: the single accent (the wordmark dot, focus rings, selected tints, active-tab dot). */
  accent: '#5B4DFF',
  /** Iris lifted for Midnight grounds, where the base accent goes dim. */
  accentOnInk: '#8E84FF',
  /** Steel: the chip on a drawn card. */
  chip: '#D3D7E6',
  /** Errors only. The accent never signals a problem. */
  danger: '#C42B4B',
  white: '#FFFFFF',
  ink2: '#2B2A3D',
  ink3: '#55546B',
  ink4: '#8C8BA3',
  ink5: '#BBBBCD',
  panel: '#ECEDF7',
  hairline: 'rgba(15,14,28,0.10)',
  hairlineStrong: 'rgba(15,14,28,0.30)',
  accentTint: 'rgba(91,77,255,0.12)',
  accentRing: 'rgba(91,77,255,0.40)',
  /** @deprecated First-palette names, kept so in-flight branches compile. Use the role names above. */
  ivory: '#F5F6FC',
  /** @deprecated Use `ink`. */
  slate: '#0F0E1C',
  /** @deprecated Use `accent`. */
  clay: '#5B4DFF',
  /** @deprecated Use `chip`. */
  oat: '#D3D7E6',
  /** @deprecated Use `accentTint`. */
  clayTint: 'rgba(91,77,255,0.12)',
  /** @deprecated Use `accentRing`. */
  clayRing: 'rgba(91,77,255,0.40)',
  /** Avatar colours, assigned by hashing the user id so a person keeps their colour across screens. */
  avatars: ['#2E9A6B', '#E0654F', '#7A4DDB', '#1F9BB5', '#D1578F', '#C9A82D', '#2A78D6'],
} as const;

/** Display is Fraunces, loaded by the app as --toli-face-display; body is the platform sans, zero bytes. */
export const font = {
  serif: "var(--toli-face-display, Georgia), Georgia, 'Times New Roman', Times, serif",
  sans: "system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export const type = {
  display: { fontFamily: font.serif, fontWeight: 500, fontSize: 28, lineHeight: 1.12 },
  title: { fontFamily: font.serif, fontWeight: 500, fontSize: 24, lineHeight: 1.15 },
  cardName: { fontFamily: font.serif, fontWeight: 500, fontSize: 22, lineHeight: 1.2 },
  body: { fontFamily: font.sans, fontWeight: 400, fontSize: 15, lineHeight: 1.5 },
  bodyStrong: { fontFamily: font.sans, fontWeight: 600, fontSize: 15, lineHeight: 1.5 },
  small: { fontFamily: font.sans, fontWeight: 400, fontSize: 14, lineHeight: 1.45 },
  caption: { fontFamily: font.sans, fontWeight: 500, fontSize: 12, lineHeight: 1.4 },
  tag: { fontFamily: font.sans, fontWeight: 500, fontSize: 12, lineHeight: 1.2 },
} as const;

/** 8 pt grid. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48 } as const;

export const radius = { tag: 8, row: 16, panel: 18, pill: 999, cardThumb: 6 } as const;

/** Three elevation levels: row, panel, hero. */
export const elevation = {
  row: '0 1px 2px rgba(15,14,28,0.04), 0 12px 28px -16px rgba(15,14,28,0.22)',
  panel: '0 8px 20px -12px rgba(15,14,28,0.25)',
  hero: '0 16px 36px -12px rgba(15,14,28,0.35)',
  button: '0 8px 18px -10px rgba(15,14,28,0.55)',
  avatar: '0 2px 6px rgba(15,14,28,0.20)',
} as const;

/** Card object: issuer-tinted rectangle, light-to-shade gradient, hairline top highlight. */
export const cardSurface = (tint: string) => ({
  background: tint,
  backgroundImage:
    'linear-gradient(135deg, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.06) 42%, rgba(15,14,28,0.24) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 3px 8px rgba(15,14,28,0.20)',
});

export const avatarColorFor = (key: string): string => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return color.avatars[h % color.avatars.length]!;
};

export const initialOf = (name: string): string => {
  const first = name.trim().split(/\s+/)[0] ?? '';
  return first.slice(0, 1).toUpperCase() || '?';
};
