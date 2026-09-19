'use client';
import { Button, Checkbox, FactRow, Heading, IconCircle, Lede, Panel } from '@toli/ui';
import Link from 'next/link';
import { useState } from 'react';
import { callableMessage, callDeleteAccount } from '@/lib/api';
import { loadFirebase } from '@/lib/firebase';

const GOES = [
  'Your name and your phone number',
  'Every card you added',
  'Your place in every group',
  'Every 1:1 share, for both of you',
];

export function DeleteAccount() {
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [needsSignIn, setNeedsSignIn] = useState(false);

  const leave = async (to: string) => {
    const { infra } = await loadFirebase();
    await infra.wipeLocalData();
    // A full load: the Firestore instance is terminated, and nothing of theirs should stay in memory.
    window.location.replace(to);
  };

  const remove = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await callDeleteAccount();
      await leave('/auth?deleted=1');
    } catch (err) {
      const details =
        err && typeof err === 'object' && 'details' in err
          ? (err as { details?: { code?: string } }).details
          : undefined;
      if (details?.code === 'recent-sign-in-required') setNeedsSignIn(true);
      else setError(callableMessage(err));
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        padding: '52px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        backgroundImage: 'var(--toli-hero-glow)',
      }}
    >
      <Link
        href="/settings"
        aria-label="Back to settings"
        style={{ marginLeft: -12, color: 'inherit', alignSelf: 'flex-start' }}
      >
        <IconCircle>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </IconCircle>
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Heading size="title">Delete your account</Heading>
        <Lede>Everything goes, immediately. There is no undo and nothing is kept.</Lede>
      </div>

      <Panel>
        <ul style={{ margin: 0, padding: 0 }}>
          {GOES.map((item) => (
            <FactRow key={item} tone="never">
              {item}
            </FactRow>
          ))}
        </ul>
      </Panel>
      <Lede>Your friends stay in their groups. They just stop seeing you and your cards.</Lede>

      {needsSignIn ? (
        <Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: 'var(--toli-ink)', fontWeight: 600 }}>Sign in again first</div>
            <div>
              To delete an account we need a sign-in from the last ten minutes, so an open session
              on a borrowed phone is not enough.
            </div>
            <Button
              full
              onClick={() => leave(`/auth?next=${encodeURIComponent('/settings/delete')}`)}
            >
              Sign in again
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          <Checkbox id="understood" checked={understood} onChange={setUnderstood}>
            I understand this deletes my account and cannot be undone.
          </Checkbox>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              role="alert"
              id="delete-error"
              style={{
                minHeight: 18,
                fontSize: 13,
                lineHeight: '18px',
                color: 'var(--toli-danger, #C42B4B)',
              }}
            >
              {error}
            </div>
            <Button full onClick={remove} disabled={!understood || busy}>
              {busy ? 'Deleting…' : 'Delete my account'}
            </Button>
            <Link href="/settings" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="small" full tabIndex={-1}>
                Keep my account
              </Button>
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
