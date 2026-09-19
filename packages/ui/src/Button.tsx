import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { color, elevation, font } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger';

export interface ButtonLook {
  variant?: ButtonVariant | undefined;
  size?: 'default' | 'small' | undefined;
  full?: boolean | undefined;
  disabled?: boolean | undefined;
}

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'>, Omit<ButtonLook, 'disabled'> {}

/** Pressed and hover feedback live in tokens.css under this class; inline styles cannot express them. */
export const BUTTON_CLASS = 'toli-btn';

const looks: Record<ButtonVariant, CSSProperties> = {
  primary: { background: color.ink, color: color.white, boxShadow: elevation.button },
  secondary: {
    background: color.white,
    color: color.ink,
    borderColor: color.hairlineStrong,
    boxShadow: '0 1px 2px rgba(15,14,28,0.06)',
  },
  tonal: { background: color.tonal, color: color.ink },
  danger: {
    background: color.white,
    color: color.danger,
    borderColor: color.dangerRing,
    boxShadow: '0 1px 2px rgba(15,14,28,0.06)',
  },
};

/**
 * The pill every action wears, as a style object, so a router link can look exactly like a button
 * without nesting a `<button>` inside an `<a>`. Every variant has a visible surface: an action never
 * reads as a text link.
 */
export function buttonStyle({
  variant = 'primary',
  size = 'default',
  full = false,
  disabled = false,
}: ButtonLook = {}): CSSProperties {
  const height = size === 'small' ? 40 : 52;
  return {
    fontFamily: font.sans,
    height,
    padding: size === 'small' ? '0 16px' : '0 22px',
    borderRadius: height / 2,
    fontSize: size === 'small' ? 14 : 16,
    fontWeight: 600,
    width: full ? '100%' : undefined,
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    border: '1px solid transparent',
    ...(disabled
      ? // A flat, quiet surface: clearly a button, clearly not available yet.
        { background: color.panel, color: color.ink4, cursor: 'not-allowed' }
      : looks[variant]),
  };
}

/** Pill buttons: Midnight primary, white outlined secondary, tinted tonal, and danger for removal. */
export function Button({ variant, size, full, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={className ? `${BUTTON_CLASS} ${className}` : BUTTON_CLASS}
      style={buttonStyle({ variant, size, full, disabled: rest.disabled })}
      {...rest}
    >
      {children}
    </button>
  );
}
