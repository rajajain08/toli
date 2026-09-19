'use client';
import { Button } from '@toli/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { callableMessage, callJoinByInvite } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** Signed in: one tap joins. Otherwise: sign in, and come straight back to this invite. */
export function JoinPanel({ code, groupName }: { code: string; groupName: string }) {
  const { state } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => void track('invite_opened'), []);

  const ready = state.status === 'signedIn' && state.profile !== null;

  const join = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await callJoinByInvite({ code });
      router.replace(`/groups/${res.audienceId}`);
    } catch (err) {
      setError(callableMessage(err));
      setBusy(false);
    }
  };

  if (state.status === 'loading') return <div aria-busy="true" style={{ height: 52 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ready ? (
        <Button full onClick={join} disabled={busy}>
          {busy ? 'Joining…' : `Join ${groupName}`}
        </Button>
      ) : (
        <Link
          href={`/auth?next=${encodeURIComponent(`/join/${code}`)}`}
          style={{ textDecoration: 'none' }}
        >
          <Button full tabIndex={-1}>
            Sign in to join
          </Button>
        </Link>
      )}
      {error ? (
        <div
          role="alert"
          id="join-error"
          style={{ fontSize: 14, color: 'var(--toli-danger, #C42B4B)' }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
