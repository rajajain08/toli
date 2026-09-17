import type { ReactNode } from 'react';
import { color, font } from './tokens';

/** The lock line from the landing screen: "We only store card names. Never numbers…". */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        color: color.ink3,
        fontFamily: font.sans,
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 1 }}
        aria-hidden
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
