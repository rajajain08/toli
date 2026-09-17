import type { ButtonHTMLAttributes } from 'react';
import { color, elevation, font } from './tokens';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost' | undefined;
  size?: 'default' | 'small' | undefined;
  full?: boolean | undefined;
}

/** Pill buttons: Slate primary, white outlined secondary, borderless ghost. */
export function Button({
  variant = 'primary',
  size = 'default',
  full = false,
  children,
  ...rest
}: ButtonProps) {
  const height = size === 'small' ? 36 : 52;
  const shared = {
    fontFamily: font.sans,
    height,
    padding: size === 'small' ? '0 14px' : '0 22px',
    borderRadius: height / 2,
    fontSize: size === 'small' ? 14 : 16,
    fontWeight: 600,
    width: full ? '100%' : undefined,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    whiteSpace: 'nowrap',
  } as const;
  const look =
    variant === 'primary'
      ? { background: color.slate, color: color.white, border: 0, boxShadow: elevation.button }
      : variant === 'secondary'
        ? {
            background: color.white,
            color: color.slate,
            border: `0.5px solid ${color.hairlineStrong}`,
          }
        : { background: 'transparent', color: color.slate, border: 0 };
  return (
    <button
      type="button"
      style={{ ...shared, ...look, opacity: rest.disabled ? 0.5 : 1 }}
      {...rest}
    >
      {children}
    </button>
  );
}
