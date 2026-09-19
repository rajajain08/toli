import type { ReactNode } from 'react';
import { color, font } from './tokens';

/** Uppercase 12 px section label with an optional count badge and a trailing action. */
export function SectionLabel({
  children,
  count,
  action,
}: {
  children: ReactNode;
  count?: number | undefined;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 600,
            color: color.ink3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {children}
        </h2>
        {count !== undefined ? (
          <span
            aria-label={`${count} selected`}
            style={{
              fontFamily: font.sans,
              fontSize: 12,
              fontWeight: 600,
              color: color.white,
              background: color.ink,
              borderRadius: 9,
              padding: '1px 7px',
            }}
          >
            {count}
          </span>
        ) : null}
      </div>
      {action}
    </div>
  );
}
