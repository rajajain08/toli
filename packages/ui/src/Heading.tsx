import type { ReactNode } from 'react';
import { color, font } from './tokens';

export function Heading({
  children,
  size = 'display',
}: {
  children: ReactNode;
  size?: 'display' | 'title' | undefined;
}) {
  return (
    <h1
      style={{
        margin: 0,
        fontFamily: font.serif,
        fontWeight: 500,
        fontSize: size === 'display' ? 30 : 24,
        lineHeight: 1.12,
        letterSpacing: '-0.01em',
        color: color.ink,
      }}
    >
      {children}
    </h1>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <p
      style={{ margin: 0, fontFamily: font.sans, fontSize: 15, lineHeight: 1.5, color: color.ink3 }}
    >
      {children}
    </p>
  );
}
