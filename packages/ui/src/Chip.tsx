import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { color, elevation, font } from './tokens';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  selected?: boolean | undefined;
  /** Small chips are the 12 px tags on a card row; default chips are the 38 px filter pills. */
  size?: 'default' | 'small' | undefined;
  accent?: string | undefined;
}

export function Chip({
  selected = false,
  size = 'default',
  accent = color.slate,
  children,
  ...rest
}: ChipProps) {
  const base: CSSProperties =
    size === 'small'
      ? {
          fontFamily: font.sans,
          fontSize: 12,
          fontWeight: 500,
          padding: '3px 8px',
          borderRadius: 8,
          background: color.panel,
          color: color.ink2,
          border: 0,
          whiteSpace: 'nowrap',
        }
      : {
          fontFamily: font.sans,
          height: 38,
          padding: '0 16px',
          borderRadius: 19,
          fontSize: 14,
          whiteSpace: 'nowrap',
          ...(selected
            ? {
                border: `1px solid ${accent}`,
                background: accent,
                color: color.white,
                fontWeight: 600,
                boxShadow: elevation.button,
              }
            : {
                border: `0.5px solid ${color.hairlineStrong}`,
                background: color.white,
                color: color.slate,
                fontWeight: 500,
              }),
        };
  return (
    <button
      type="button"
      aria-pressed={size === 'default' ? selected : undefined}
      style={base}
      {...rest}
    >
      {children}
    </button>
  );
}
