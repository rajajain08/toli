import type { ReactNode } from 'react';
import { Avatar } from './AvatarRow';
import { color, elevation, font, radius } from './tokens';

/** A group on the Groups home: name, a live summary line and a chevron. The caller wraps it in a link. */
export function GroupTile({
  name,
  summary,
  leading,
}: {
  name: string;
  summary: string;
  leading?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: color.white,
        border: `0.5px solid ${color.hairline}`,
        borderRadius: radius.row,
        boxShadow: elevation.row,
        padding: '14px 14px',
        color: color.ink,
      }}
    >
      {leading ?? <Avatar person={{ id: name, name }} size={40} />}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div
          style={{
            fontFamily: font.sans,
            fontSize: 16,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        <div style={{ fontFamily: font.sans, fontSize: 13, color: color.ink3 }}>{summary}</div>
      </div>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color.ink4}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

/** One line in the "Who can see this card" panel: a label and a switch, hairline between rows. */
export function ToggleRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean | undefined;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        borderBottom: last ? 'none' : `0.5px solid ${color.hairline}`,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color.ink3}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <div
        style={{
          flexGrow: 1,
          fontFamily: font.sans,
          fontSize: 15,
          fontWeight: 500,
          color: color.ink,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

/** Person header above their cards on the group screen. */
export function PersonHeader({
  id,
  name,
  note,
  empty = false,
}: {
  id: string;
  name: string;
  note?: string | undefined;
  empty?: boolean | undefined;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px' }}>
      <Avatar person={{ id, name, empty }} size={28} />
      <div style={{ fontFamily: font.sans, fontSize: 15, fontWeight: 600, color: color.ink }}>
        {name}
      </div>
      {note ? (
        <div style={{ fontFamily: font.sans, fontSize: 13, color: color.ink3 }}>{note}</div>
      ) : null}
    </div>
  );
}
