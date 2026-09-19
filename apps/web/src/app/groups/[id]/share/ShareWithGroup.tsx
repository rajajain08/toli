'use client';
import { getCatalogCard } from '@toli/catalog';
import { GroupId, type UserCardId } from '@toli/domain';
import { ActionBar, Button, CardRow, Heading, Lede, Notice, SectionLabel } from '@toli/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAudience, useSetVisibility } from '@/lib/useGroups';
import { useMyCards } from '@/lib/useMyCards';

/**
 * Shown right after someone joins a group (and from the group's "Choose cards" nudge): pick which of your
 * cards this group can see. Everything is ticked to begin with, because that is why people join; nothing
 * is shared until they press the button, and "Not now" shares nothing.
 */
export function ShareWithGroup({ id }: { id: string }) {
  const router = useRouter();
  const { data: audience } = useAudience(id);
  const { data: cards } = useMyCards();
  const setVisibility = useSetVisibility();
  const [picked, setPicked] = useState<Set<string> | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const groupUrl = `/groups/${id}`;
  const groupName = audience?.name ?? 'this group';

  // Nothing to choose from: go straight to the group, which nudges towards adding cards.
  useEffect(() => {
    if (cards && cards.length === 0) router.replace(groupUrl);
  }, [cards, router, groupUrl]);

  // Tick everything once, when the wallet first arrives.
  useEffect(() => {
    if (cards && picked === undefined) setPicked(new Set(cards.map((c) => c.id)));
  }, [cards, picked]);

  const alreadyShared = useMemo(
    () =>
      new Set((cards ?? []).filter((c) => c.isVisibleTo(GroupId(id))).map((c) => c.id as string)),
    [cards, id],
  );
  const n = picked?.size ?? 0;

  const toggle = (cardId: string) =>
    setPicked((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });

  const share = async () => {
    if (!cards || !picked) return;
    setBusy(true);
    setError(undefined);
    try {
      // Bring the group in line with the ticks: show what is ticked, hide what was shared and is now unticked.
      for (const c of cards) {
        const want = picked.has(c.id);
        if (want !== alreadyShared.has(c.id))
          await setVisibility.mutateAsync({
            cardId: c.id as UserCardId,
            audienceId: id,
            visible: want,
          });
      }
      router.replace(groupUrl);
    } catch {
      setError('That did not save. Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'var(--toli-hero-glow)',
      }}
    >
      <div
        style={{
          flexGrow: 1,
          padding: '52px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Heading size="title">Share your cards with {groupName}?</Heading>
          <Lede>
            People in this group will see the names of the cards you pick, and nothing else. You can
            change this anytime from My cards.
          </Lede>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel count={n}>Your cards</SectionLabel>
          {cards === undefined || picked === undefined ? (
            <div
              aria-busy="true"
              style={{ height: 64, borderRadius: 16, background: 'var(--toli-panel)' }}
            />
          ) : (
            cards.map((c) => {
              const cat = getCatalogCard(c.cardId);
              return (
                <CardRow
                  key={c.id}
                  name={cat?.name ?? c.cardId}
                  issuer={cat?.issuer ?? ''}
                  tint={cat?.color ?? '#3D3D3A'}
                  sub={cat ? `${cat.bank} · ${cat.perks[0] ?? ''}` : undefined}
                  selected={picked.has(c.id)}
                  onToggle={() => toggle(c.id)}
                  toggleLabels={{
                    on: `Don’t share ${cat?.name ?? 'card'}`,
                    off: `Share ${cat?.name ?? 'card'}`,
                  }}
                />
              );
            })
          )}
        </section>

        <Notice>
          Card names only. Never numbers, CVV, limits or balances.{' '}
          <Link href="/privacy" style={{ fontWeight: 600 }}>
            See exactly what friends see
          </Link>
        </Notice>
        <div
          role="alert"
          id="share-error"
          style={{
            minHeight: 18,
            fontSize: 13,
            lineHeight: '18px',
            color: 'var(--toli-danger, #C42B4B)',
          }}
        >
          {error}
        </div>
      </div>

      <ActionBar>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button full onClick={share} disabled={busy || cards === undefined}>
            {busy
              ? 'Sharing…'
              : n === 0
                ? 'Share nothing for now'
                : `Share ${n} card${n === 1 ? '' : 's'}`}
          </Button>
          <Button
            variant="ghost"
            size="small"
            full
            onClick={() => router.replace(groupUrl)}
            disabled={busy}
          >
            Not now
          </Button>
        </div>
      </ActionBar>
    </div>
  );
}
