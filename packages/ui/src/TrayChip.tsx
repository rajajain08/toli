import { cardSurface, color, font } from './tokens';

/** A selected card in the "Your cards" tray: swatch, name, 28 px remove button. */
export function TrayChip({
  name,
  tint,
  onRemove,
}: {
  name: string;
  tint: string;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 40,
        padding: '0 6px',
        borderRadius: 20,
        background: color.white,
        border: `0.5px solid ${color.hairlineStrong}`,
        boxShadow: '0 1px 2px rgba(15,14,28,0.04), 0 8px 18px -12px rgba(15,14,28,0.22)',
      }}
    >
      <div
        style={{ width: 30, height: 20, borderRadius: 4, ...cardSurface(tint), boxShadow: 'none' }}
      />
      <span style={{ fontFamily: font.sans, fontSize: 14, fontWeight: 500, color: color.ink }}>
        {name}
      </span>
      <button
        type="button"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
        style={{
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 14,
          background: color.panel,
          color: color.ink3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
