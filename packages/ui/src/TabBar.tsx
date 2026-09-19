import type { ReactNode } from 'react';
import { color, font } from './tokens';

export interface TabItem {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
}

export interface TabBarProps {
  items: readonly TabItem[];
  activeId: string;
  /** Lets the app swap in Next's Link without the ui package importing next. */
  renderLink?:
    ((item: TabItem, children: ReactNode, style: React.CSSProperties) => ReactNode) | undefined;
}

/** Frosted bottom tab bar with an Iris dot under the active tab. Solid fallback where backdrop-filter is unsupported. */
export function TabBar({ items, activeId, renderLink }: TabBarProps) {
  return (
    <nav
      aria-label="Primary"
      style={{
        display: 'flex',
        gap: 8,
        padding: '10px 24px calc(24px + env(safe-area-inset-bottom))',
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: `0.5px solid rgba(15,14,28,0.08)`,
        boxShadow: '0 -10px 30px -18px rgba(15,14,28,0.25)',
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const style: React.CSSProperties = {
          flexGrow: 1,
          minHeight: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          textDecoration: 'none',
          color: active ? color.ink : color.ink3,
          fontFamily: font.sans,
          fontSize: 12,
          fontWeight: active ? 600 : 500,
        };
        const children = (
          <>
            {item.icon}
            <span>{item.label}</span>
            {active ? (
              <span
                data-testid="tab-dot"
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  background: color.accent,
                  display: 'block',
                  marginTop: -2,
                }}
              />
            ) : null}
          </>
        );
        return renderLink ? (
          <span key={item.id} style={{ display: 'contents' }}>
            {renderLink(item, children, style)}
          </span>
        ) : (
          <a
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            style={style}
          >
            {children}
          </a>
        );
      })}
    </nav>
  );
}
