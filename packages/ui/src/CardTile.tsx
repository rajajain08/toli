import type { CSSProperties, ReactNode } from 'react';
import { cardSurface, color, elevation, font, radius } from './tokens';

/** The card drawn as an object. Never shows a number, only the catalogue name and issuer. */
export interface CardTileProps {
  name: string;
  issuer: string;
  tint: string;
  /** thumb: 56×36 in a list row. wallet: 290×182 in the My cards carousel. */
  variant?: 'thumb' | 'wallet' | undefined;
  selected?: boolean | undefined;
  footer?: ReactNode;
  onClick?: (() => void) | undefined;
}

export function CardTile({
  name,
  issuer,
  tint,
  variant = 'thumb',
  selected = false,
  footer,
  onClick,
}: CardTileProps) {
  if (variant === 'thumb') {
    return (
      <div
        role="img"
        aria-label={`${issuer} ${name}`}
        style={{
          width: 56,
          height: 36,
          borderRadius: radius.cardThumb,
          ...cardSurface(tint),
          flexShrink: 0,
          boxSizing: 'border-box',
          padding: '6px 7px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ width: 11, height: 8, borderRadius: 2, background: color.chip }} />
        <div
          style={{ height: 3, width: 26, borderRadius: 2, background: 'rgba(255,255,255,0.55)' }}
        />
      </div>
    );
  }
  const style: CSSProperties = {
    width: 290,
    height: 182,
    borderRadius: radius.panel,
    border: 0,
    textAlign: 'left',
    ...cardSurface(tint),
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), ${selected ? elevation.hero : elevation.panel}`,
    flexShrink: 0,
    boxSizing: 'border-box',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    opacity: selected ? 1 : 0.88,
    transform: `scale(${selected ? 1 : 0.96})`,
    transition: 'transform 200ms ease, opacity 200ms ease',
    color: color.white,
  };
  const body = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div style={{ width: 38, height: 28, borderRadius: 6, background: color.chip }} />
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: '0.06em',
          }}
        >
          {issuer.toUpperCase()}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
        <div style={{ fontFamily: font.serif, fontSize: 22, fontWeight: 500 }}>{name}</div>
        {footer ? (
          <div style={{ fontFamily: font.sans, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
  return onClick ? (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Select ${name}`}
      onClick={onClick}
      style={style}
    >
      {body}
    </button>
  ) : (
    <div role="img" aria-label={`${issuer} ${name}`} style={style}>
      {body}
    </div>
  );
}
