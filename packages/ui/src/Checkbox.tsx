import type { ReactNode } from 'react';
import { color, font } from './tokens';

export interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
  /** Marks the box itself when it is the thing that needs attention. */
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
}

/** Consent-style checkbox: 22 px box with an Iris fill when checked, label wraps beside it. */
export function Checkbox({
  id,
  checked,
  onChange,
  children,
  invalid = false,
  describedBy,
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
    >
      <span style={{ position: 'relative', width: 22, height: 22, flexShrink: 0, marginTop: 1 }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          style={{
            position: 'absolute',
            inset: 0,
            width: 22,
            height: 22,
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
        <span
          aria-hidden
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 6,
            boxSizing: 'border-box',
            border: checked
              ? `1px solid ${color.accent}`
              : invalid
                ? `1.5px solid ${color.danger}`
                : `1px solid ${color.hairlineStrong}`,
            background: checked ? color.accent : color.white,
            transition: 'background 150ms ease',
          }}
        >
          {checked ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={color.white}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : null}
        </span>
      </span>
      <span style={{ fontFamily: font.sans, fontSize: 14, lineHeight: 1.45, color: color.ink2 }}>
        {children}
      </span>
    </label>
  );
}
