import type { InputHTMLAttributes, ReactNode } from 'react';
import { color, font } from './tokens';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'style' | 'id' | 'prefix'
> {
  id: string;
  label: string;
  /** Fixed prefix such as "+91". */
  prefix?: ReactNode;
  hint?: string | undefined;
  error?: string | undefined;
}

/** 52 px white field with a hairline border, from the invite landing mockup. */
export function TextField({ id, label, prefix, hint, error, ...rest }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor={id} style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 600 }}>
        {label}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: color.white,
          border: `0.5px solid ${error ? color.danger : 'rgba(15,14,28,0.22)'}`,
          borderRadius: 12,
          height: 52,
          boxShadow: '0 1px 2px rgba(15,14,28,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
          overflow: 'hidden',
        }}
      >
        {prefix ? (
          <div
            style={{
              padding: '0 14px',
              fontFamily: font.sans,
              fontSize: 16,
              fontWeight: 500,
              color: color.ink3,
              borderRight: '0.5px solid rgba(15,14,28,0.15)',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {prefix}
          </div>
        ) : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          style={{
            flexGrow: 1,
            height: '100%',
            border: 0,
            outline: 0,
            padding: '0 14px',
            fontFamily: font.sans,
            fontSize: 16,
            background: 'transparent',
            color: color.ink,
            minWidth: 0,
          }}
          {...rest}
        />
      </div>
      {error ? (
        <div
          id={`${id}-error`}
          role="alert"
          style={{ fontFamily: font.sans, fontSize: 13, color: color.danger }}
        >
          {error}
        </div>
      ) : hint ? (
        <div id={`${id}-hint`} style={{ fontFamily: font.sans, fontSize: 13, color: color.ink3 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}
