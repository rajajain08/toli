import type { InputHTMLAttributes } from 'react';
import { color, font } from './tokens';

export interface SearchFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'style' | 'type' | 'id'
> {
  id: string;
  label: string;
}

/** 48 px search box with a leading magnifier. The label is visually hidden but read by screen readers. */
export function SearchField({ id, label, ...rest }: SearchFieldProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: color.white,
        border: '0.5px solid rgba(31,30,29,0.22)',
        borderRadius: 12,
        height: 48,
        boxShadow: '0 1px 2px rgba(20,20,19,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
        padding: '0 14px',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color.ink3}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <label
        htmlFor={id}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="search"
        style={{
          flexGrow: 1,
          border: 0,
          outline: 0,
          fontFamily: font.sans,
          fontSize: 15,
          background: 'transparent',
          color: color.slate,
          minWidth: 0,
        }}
        {...rest}
      />
    </div>
  );
}
