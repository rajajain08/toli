'use client';
import { Button, Heading, IconCircle, Lede, TextField } from '@toli/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { callableMessage, callCreateAudience } from '@/lib/api';

export function NewGroup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const res = await callCreateAudience({ name });
      router.replace(`/groups/${res.audienceId}?invite=${res.inviteCode}`);
    } catch (err) {
      setError(callableMessage(err));
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
        gap: 24,
        backgroundImage: 'var(--toli-hero-glow)',
      }}
    >
      <Link
        href="/groups"
        aria-label="Back to groups"
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
      <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Heading size="title">Start a group</Heading>
          <Lede>Name it after the people in it. You get a link to send them next.</Lede>
        </div>
        <TextField
          id="group-name"
          label="Group name"
          placeholder="Weekend Crew"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
        />
        <Button type="submit" full disabled={busy || name.trim().length === 0}>
          {busy ? 'Creating…' : 'Create group'}
        </Button>
      </form>
    </main>
  );
}
