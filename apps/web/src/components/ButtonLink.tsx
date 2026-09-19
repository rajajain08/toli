import { BUTTON_CLASS, buttonStyle, type ButtonLook } from '@toli/ui';
import Link from 'next/link';
import type { ComponentProps } from 'react';

/** A navigation that looks like a button: one `<a>` wearing the button style, never a button inside a link. */
export function ButtonLink({
  variant,
  size,
  full,
  children,
  ...rest
}: Omit<ComponentProps<typeof Link>, 'style' | 'className'> & Omit<ButtonLook, 'disabled'>) {
  return (
    <Link className={BUTTON_CLASS} style={buttonStyle({ variant, size, full })} {...rest}>
      {children}
    </Link>
  );
}
