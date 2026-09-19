import type { ReactNode } from 'react';
import { CardTile } from './CardTile';
import { color, elevation, font, radius } from './tokens';

export interface CardRowProps {
  name: string;
  issuer: string;
  tint: string;
  sub?: string | undefined;
  tags?: readonly string[] | undefined;
  /** Add/remove round button on the right. Omit for a read-only row (group screen). */
  selected?: boolean | undefined;
  onToggle?: (() => void) | undefined;
  trailing?: ReactNode;
}

/** A card in a list: thumb, name, a sub line or tag chips, and an optional 44 px add/remove button. */
export function CardRow({
  name,
  issuer,
  tint,
  sub,
  tags,
  selected = false,
  onToggle,
  trailing,
}: CardRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: selected ? 'rgba(91,77,255,0.08)' : color.white,
        border: `0.5px solid ${selected ? 'rgba(91,77,255,0.5)' : color.hairline}`,
        borderRadius: radius.row,
        boxShadow: elevation.row,
        padding: onToggle ? '10px 8px 10px 12px' : 12,
      }}
    >
      <CardTile name={name} issuer={issuer} tint={tint} />
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: tags ? 6 : 2,
          minWidth: 0,
        }}
      >
        <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 600, color: color.ink }}>
          {name}
        </div>
        {sub ? (
          <div
            style={{
              fontFamily: font.sans,
              fontSize: 13,
              color: color.ink3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </div>
        ) : null}
        {tags ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: font.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '3px 8px',
                  borderRadius: 8,
                  background: color.panel,
                  color: color.ink2,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {trailing}
      {onToggle ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={selected ? `Remove ${name}` : `Add ${name}`}
          onClick={onToggle}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            ...(selected
              ? {
                  border: 0,
                  background: color.ink,
                  color: color.white,
                  boxShadow: '0 6px 14px -6px rgba(15,14,28,0.5)',
                }
              : {
                  border: `0.5px solid ${color.hairlineStrong}`,
                  background: color.white,
                  color: color.ink,
                }),
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {selected ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </>
            )}
          </svg>
        </button>
      ) : null}
    </div>
  );
}
