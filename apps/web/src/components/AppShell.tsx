'use client';
import { TabBar, type TabItem } from '@toli/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { RequireAuth } from './RequireAuth';

const icon = (d: ReactNode) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {d}
  </svg>
);

export const TABS: readonly TabItem[] = [
  {
    id: 'groups',
    label: 'Groups',
    href: '/groups',
    icon: icon(
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>,
    ),
  },
  {
    id: 'find',
    label: 'Find',
    href: '/find',
    icon: icon(
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>,
    ),
  },
  {
    id: 'cards',
    label: 'My cards',
    href: '/cards',
    icon: icon(
      <>
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </>,
    ),
  },
];

export function AppShell({
  active,
  children,
  flush = false,
}: {
  active: (typeof TABS)[number]['id'];
  children: ReactNode;
  /** Screen manages its own padding (full-bleed carousels). */
  flush?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <main
        style={{
          flexGrow: 1,
          padding: flush ? 0 : '52px 24px 24px',
          backgroundImage: 'var(--toli-hero-glow)',
        }}
      >
        <RequireAuth>{children}</RequireAuth>
      </main>
      <div style={{ position: 'sticky', bottom: 0 }}>
        <TabBar
          items={TABS}
          activeId={active}
          renderLink={(item, children, style) => (
            <Link
              href={item.href}
              aria-current={item.id === active ? 'page' : undefined}
              style={style}
            >
              {children}
            </Link>
          )}
        />
      </div>
    </div>
  );
}
