/**
 * Design tokens from docs/design/README.md and the mockups. Colours are the only source of truth for
 * the palette; tokens.css mirrors them as CSS variables for global styles.
 */
export const color = {
  ivory: '#FAF9F5',
  slate: '#141413',
  clay: '#D97757',
  oat: '#E3DACC',
  white: '#FFFFFF',
  ink2: '#3D3D3A',
  ink3: '#5E5D59',
  ink4: '#9C9A92',
  ink5: '#C2C0B6',
  panel: '#F0EEE6',
  hairline: 'rgba(31,30,29,0.10)',
  hairlineStrong: 'rgba(31,30,29,0.30)',
  clayTint: 'rgba(217,119,87,0.13)',
  clayRing: 'rgba(217,119,87,0.40)',
  /** Avatar colours, assigned by hashing the user id so a person keeps their colour across screens. */
  avatars: ['#558A42', '#D97757', '#6B4D9E', '#2E9191', '#C46686', '#C9A82D', '#2A78D6'],
} as const;

export const font = {
  serif: "'Anthropic Serif', Georgia, 'Times New Roman', Times, serif",
  sans: "'Anthropic Sans', system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
  row: '0 1px 2px rgba(20,20,19,0.04), 0 12px 28px -16px rgba(20,20,19,0.22)',
  panel: '0 8px 20px -12px rgba(20,20,19,0.25)',
  hero: '0 16px 36px -12px rgba(20,20,19,0.35)',
  button: '0 8px 18px -10px rgba(20,20,19,0.55)',
  avatar: '0 2px 6px rgba(20,20,19,0.20)',
} as const;

/** Card object: issuer-tinted rectangle, light-to-shade gradient, hairline top highlight. */
export const cardSurface = (tint: string) => ({
  background: tint,
  backgroundImage:
    'linear-gradient(135deg, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.06) 42%, rgba(20,20,19,0.24) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 3px 8px rgba(20,20,19,0.20)',
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
