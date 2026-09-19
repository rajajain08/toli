'use client';
import {
  Button,
  Heading,
  IconCircle,
  Lede,
  Panel,
  SectionLabel,
  Toggle,
  ToggleRow,
} from '@toli/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ButtonLink } from '@/components/ButtonLink';
import {
  callableMessage,
  callGetMyAccount,
  callSetMarketingOptIn,
  type MyAccount,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function Settings() {
  const router = useRouter();
  const client = useQueryClient();
  const { signOut } = useAuth();
  const [error, setError] = useState<string | undefined>();
  const account = useQuery<MyAccount>({
    queryKey: ['account'],
    queryFn: callGetMyAccount,
    staleTime: 0,
  });

  // Withdrawing consent must be as easy as giving it: one switch, optimistic, rolled back if it fails.
  const marketing = useMutation({
    mutationFn: (optIn: boolean) => callSetMarketingOptIn({ optIn }),
    onMutate: async (optIn) => {
      setError(undefined);
      // A read already in flight would land after this and put the old value back.
      await client.cancelQueries({ queryKey: ['account'] });
      const previous = client.getQueryData<MyAccount>(['account']);
      if (previous)
        client.setQueryData<MyAccount>(['account'], { ...previous, marketingOptIn: optIn });
      return { previous };
    },
    onError: (err, _optIn, ctx) => {
      client.setQueryData(['account'], ctx?.previous);
      setError(callableMessage(err));
    },
    onSuccess: (res) => {
      const current = client.getQueryData<MyAccount>(['account']);
      if (current)
        client.setQueryData<MyAccount>(['account'], {
          ...current,
          marketingOptIn: res.marketingOptIn,
        });
    },
  });

  const a = account.data;
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
        href="/cards"
        aria-label="Back"
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
      <Heading size="title">Settings</Heading>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>You</SectionLabel>
        {a ? (
          <Panel>
            <div style={{ color: 'var(--toli-ink)', fontWeight: 600, fontSize: 15 }}>{a.name}</div>
            <div>{a.phoneMasked ? `Phone ${a.phoneMasked}` : 'No phone number on file'}</div>
          </Panel>
        ) : (
          <div
            aria-busy="true"
            style={{ height: 64, borderRadius: 16, background: 'var(--toli-panel)' }}
          />
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Messages from Toli</SectionLabel>
        <Panel>
          <ToggleRow label="Updates and offers" last>
            <Toggle
              on={a?.marketingOptIn ?? false}
              disabled={!a}
              busy={marketing.isPending}
              label={`${a?.marketingOptIn ? 'Stop' : 'Send me'} updates and offers from Toli`}
              onChange={(optIn) => marketing.mutate(optIn)}
            />
          </ToggleRow>
        </Panel>
        <Lede>
          Occasional news and offers on your number. Off means off: we only message you about your
          own account.
        </Lede>
        <div
          role="alert"
          id="settings-error"
          style={{
            minHeight: 18,
            fontSize: 13,
            lineHeight: '18px',
            color: 'var(--toli-danger, #C42B4B)',
          }}
        >
          {error}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Privacy</SectionLabel>
        <ButtonLink href="/privacy" variant="secondary" full>
          What friends can see
        </ButtonLink>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionLabel>Account</SectionLabel>
        <ButtonLink href="/settings/delete" variant="danger" full>
          Delete my account
        </ButtonLink>
      </section>

      <Button
        variant="secondary"
        full
        onClick={async () => {
          await signOut();
          client.clear();
          router.replace('/auth');
        }}
      >
        Sign out
      </Button>
    </main>
  );
}
