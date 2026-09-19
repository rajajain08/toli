'use client';
import { Button } from '@toli/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ButtonLink';
import { track } from '@/lib/analytics';
import { callableMessage, callJoinByInvite } from '@/lib/api';
import { isReady, useAuth } from '@/lib/auth';

/** Signed in: one tap joins. Otherwise: sign in, and come straight back to this invite. */
export function JoinPanel({ code, groupName }: { code: string; groupName: string }) {
  const { state } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => void track('invite_opened'), []);

  const ready = isReady(state);

  const join = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await callJoinByInvite({ code });
      // Fresh members are asked which cards this group may see; returning members go straight in.
      router.replace(
        res.alreadyMember ? `/groups/${res.audienceId}` : `/groups/${res.audienceId}/share`,
      );
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
        <ButtonLink href={`/auth?next=${encodeURIComponent(`/join/${code}`)}`} full>
          Sign in to join
        </ButtonLink>
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
