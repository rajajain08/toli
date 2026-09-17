import { avatarColorFor, color, elevation, font, initialOf } from './tokens';

export interface AvatarPerson {
  id: string;
  name: string;
  /** No cards yet: drawn as a dashed placeholder. */
  empty?: boolean | undefined;
}

export interface AvatarProps {
  person: AvatarPerson;
  size?: number | undefined;
  selected?: boolean | undefined;
  label?: string | undefined;
}

export function Avatar({ person, size = 48, selected = false, label }: AvatarProps) {
  const isAll = person.id === 'all';
  const bg = isAll ? color.slate : person.empty ? color.panel : avatarColorFor(person.id);
  const border = selected
    ? `2px solid ${color.slate}`
    : person.empty
      ? `2px dashed ${color.hairlineStrong}`
      : `2px solid ${color.ivory}`;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: bg,
        color: person.empty ? color.ink4 : color.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font.sans,
        fontSize: isAll ? size * 0.27 : size * 0.35,
        fontWeight: 600,
        border,
        boxShadow: selected ? `0 0 0 3px ${color.clayRing}, ${elevation.avatar}` : elevation.avatar,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {label ?? (isAll ? 'All' : initialOf(person.name))}
    </div>
  );
}

export interface AvatarRowProps {
  people: readonly AvatarPerson[];
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  /** Renders a trailing "+" action, e.g. Invite. */
  action?: { label: string; onClick: () => void } | undefined;
}

/** Horizontal row of people used to filter a group screen. `people` may start with `{ id: 'all', name: 'Everyone' }`. */
export function AvatarRow({ people, selectedId, onSelect, action }: AvatarRowProps) {
  return (
    <div
      role="group"
      aria-label="People"
      style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollbarWidth: 'none' }}
    >
      {people.map((p) => {
        const selected = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={selected}
            aria-label={p.name}
            onClick={() => onSelect?.(p.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              border: 0,
              background: 'transparent',
              padding: 0,
              width: 56,
              flexShrink: 0,
            }}
          >
            <Avatar person={p} selected={selected} />
            <div
              style={{
                fontFamily: font.sans,
                fontSize: 12,
                fontWeight: selected ? 600 : 500,
                color: selected ? color.slate : p.empty ? color.ink4 : color.ink3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 56,
              }}
            >
              {p.name}
            </div>
          </button>
        );
      })}
      {action ? (
        <button
          type="button"
          aria-label={action.label}
          onClick={action.onClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            border: 0,
            background: 'transparent',
            padding: 0,
            width: 56,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: color.white,
              color: color.slate,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `0.5px solid ${color.hairlineStrong}`,
              boxShadow: '0 2px 6px rgba(20,20,19,0.12)',
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            +
          </div>
          <div style={{ fontFamily: font.sans, fontSize: 12, color: color.ink3 }}>
            {action.label}
          </div>
        </button>
      ) : null}
    </div>
  );
}
