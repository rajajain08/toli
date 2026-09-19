import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { color, elevation, font, radius } from './tokens';

/** 13 px perk pill under a wallet card. */
export function PerkChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: font.sans,
        fontSize: 13,
        fontWeight: 500,
        padding: '6px 10px',
        borderRadius: 9,
        background: color.panel,
        color: color.ink2,
      }}
    >
      {children}
    </span>
  );
}

/** Carousel position dots; the active one stretches to 18 px. */
export function PageDots({
  count,
  active,
  onSelect,
  labelFor,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
  labelFor: (i: number) => string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={labelFor(i)}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => onSelect(i)}
          style={{
            width: i === active ? 18 : 6,
            height: 6,
            borderRadius: 3,
            border: 0,
            padding: 0,
            background: i === active ? color.ink : color.ink5,
            transition: 'width 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

/** White panel at row elevation: the "who can see this card" list, empty states. */
export function Panel({
  children,
  dashed = false,
}: {
  children: ReactNode;
  dashed?: boolean | undefined;
}) {
  return (
    <div
      style={{
        background: dashed ? 'transparent' : color.white,
        border: dashed ? `1px dashed ${color.hairlineStrong}` : `0.5px solid ${color.hairline}`,
        borderRadius: radius.row,
        boxShadow: dashed ? 'none' : elevation.row,
        padding: '12px 14px',
        fontFamily: font.sans,
        fontSize: 14,
        lineHeight: 1.45,
        color: color.ink3,
      }}
    >
      {children}
    </div>
  );
}

/** Frosted bar pinned to the bottom of a flow screen, holding the primary action. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        padding: '12px 24px calc(20px + env(safe-area-inset-bottom))',
        background: 'rgba(245,246,252,0.86)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '0.5px solid rgba(15,14,28,0.08)',
      }}
    >
      {children}
    </div>
  );
}

/** 44 px round icon control. Pass `href` semantics through `as` by wrapping in your router's link. */
export function IconCircle({
  children,
  filled = false,
  ...rest
}: { children: ReactNode; filled?: boolean | undefined } & Omit<
  AnchorHTMLAttributes<HTMLSpanElement>,
  'style'
>) {
  return (
    <span
      {...rest}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...(filled
          ? {
              background: color.ink,
              color: color.white,
              boxShadow: '0 10px 22px -10px rgba(15,14,28,0.55)',
            }
          : { color: color.ink }),
      }}
    >
      {children}
    </span>
  );
}

/** "They never see" style list row: a struck item with a small cross or tick mark. */
export function FactRow({ children, tone }: { children: ReactNode; tone: 'never' | 'seen' }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 36,
        fontFamily: font.sans,
        fontSize: 15,
        color: tone === 'never' ? color.ink3 : color.ink,
        listStyle: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tone === 'never' ? color.panel : color.accentTint,
          color: tone === 'never' ? color.ink4 : color.accent,
          flexShrink: 0,
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {tone === 'never' ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <polyline points="20 6 9 17 4 12" />
          )}
        </svg>
      </span>
      <span
        style={{
          textDecoration: tone === 'never' ? 'line-through' : 'none',
          textDecorationColor: color.ink5,
        }}
      >
        {children}
      </span>
    </li>
  );
}
