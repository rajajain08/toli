import { color } from './tokens';

export interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean | undefined;
  /** The change is on its way to the server. The switch already shows the new value; this says it is not saved yet. */
  busy?: boolean | undefined;
  accent?: string | undefined;
}

export function Toggle({
  on,
  onChange,
  label,
  disabled = false,
  accent = color.ink,
  busy = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-busy={busy ? true : undefined}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        border: 0,
        padding: 2,
        background: on ? accent : color.ink5,
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        transition: 'background 200ms ease',
        opacity: disabled ? 0.5 : busy ? 0.7 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          background: color.white,
          display: 'block',
          boxShadow: '0 1px 3px rgba(15,14,28,0.25)',
        }}
      />
    </button>
  );
}
