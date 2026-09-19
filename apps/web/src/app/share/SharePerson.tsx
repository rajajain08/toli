'use client';
import { getCatalogCard } from '@toli/catalog';
import { Audience, GroupId, UserId, type UserCardId } from '@toli/domain';
import {
  ActionBar,
  Avatar,
  Button,
  CardRow,
  Heading,
  IconCircle,
  Lede,
  Notice,
  Panel,
  SectionLabel,
} from '@toli/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { callableMessage, callShareWith } from '@/lib/api';
import { useFlag } from '@/lib/flags';
import { usePeers, useSetVisibility, useUid } from '@/lib/useGroups';
import { useMyCards } from '@/lib/useMyCards';

/** Share.dc.html: pick a person, tick cards, share. People come from your groups. */
export function SharePerson() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = useUid();
  const enabled = useFlag('directSharesEnabled');
  const { data: peers } = usePeers();
  const { data: cards } = useMyCards();
  const setVisibility = useSetVisibility();

  const [who, setWho] = useState<string | undefined>(params.get('with') ?? undefined);
  const [ticked, setTicked] = useState<Set<string> | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const person = peers?.find((p) => p.userId === who);
  const directId = uid && who ? Audience.directId(UserId(uid), UserId(who)) : undefined;
  // Cards this person already sees start ticked, so the screen edits the share as well as creating it.
  const already = useMemo(
    () =>
      new Set(
        (cards ?? []).filter((c) => directId && c.isVisibleTo(directId)).map((c) => c.id as string),
      ),
    [cards, directId],
  );
  // Seed the ticks once per person. Later snapshots of the wallet must not undo what was just ticked.
  useEffect(() => {
    if (who && cards && ticked === undefined) setTicked(new Set(already));
  }, [who, cards, ticked, already]);
  const n = ticked?.size ?? 0;
  const first = person?.name.split(' ')[0] ?? 'them';

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAll = () => setTicked(new Set((cards ?? []).map((c) => c.id as string)));

  const share = async () => {
    if (!who || !cards || !ticked) return;
    setBusy(true);
    setError(undefined);
    try {
      const { audienceId } = await callShareWith({ userId: who });
      for (const c of cards) {
        const want = ticked.has(c.id);
        if (want !== c.isVisibleTo(GroupId(audienceId)))
          await setVisibility.mutateAsync({
            cardId: c.id as UserCardId,
            audienceId,
            visible: want,
          });
      }
      router.replace(`/groups/${audienceId}`);
    } catch (err) {
      setError(callableMessage(err));
      setBusy(false);
    }
  };

  const back = (
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
  );

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
        {back}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Heading size="title">Share with a person</Heading>
          <Lede>They’ll see only the cards you tick. Stop sharing anytime.</Lede>
        </div>

        {!enabled ? (
          <Panel>Sharing with one person is not switched on yet.</Panel>
        ) : (
          <>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionLabel
                action={
                  person ? (
                    <button
                      type="button"
                      onClick={() => {
                        setWho(undefined);
                        setTicked(undefined);
                      }}
                      style={{
                        border: 0,
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--toli-ink)',
                        padding: '4px 0',
                      }}
                    >
                      Change
                    </button>
                  ) : undefined
                }
              >
                Who
              </SectionLabel>
              {peers === undefined ? (
                <div
                  aria-busy="true"
                  style={{ height: 64, borderRadius: 16, background: 'var(--toli-panel)' }}
                />
              ) : person ? (
                <Panel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar person={{ id: person.userId, name: person.name }} size={40} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--toli-ink)' }}>
                        {person.name}
                      </div>
                      <div style={{ fontSize: 13 }}>In {person.groups.join(', ')}</div>
                    </div>
                  </div>
                </Panel>
              ) : peers.length === 0 ? (
                <Panel dashed>
                  You can share with anyone who is in a group with you.{' '}
                  <Link href="/groups">Start or join a group</Link> first.
                </Panel>
              ) : (
                <div
                  role="group"
                  aria-label="People in your groups"
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {peers.map((p) => (
                    <button
                      key={p.userId}
                      type="button"
                      onClick={() => setWho(p.userId)}
                      aria-label={`Share with ${p.name}`}
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      <Panel>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar person={{ id: p.userId, name: p.name }} size={40} />
                          <div>
                            <div
                              style={{ fontSize: 15, fontWeight: 600, color: 'var(--toli-ink)' }}
                            >
                              {p.name}
                            </div>
                            <div style={{ fontSize: 13 }}>In {p.groups.join(', ')}</div>
                          </div>
                        </div>
                      </Panel>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {person ? (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <SectionLabel
                  count={n}
                  action={
                    <button
                      type="button"
                      onClick={selectAll}
                      style={{
                        border: 0,
                        background: 'transparent',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--toli-ink)',
                        padding: '4px 0',
                      }}
                    >
                      Select all
                    </button>
                  }
                >
                  Cards to share
                </SectionLabel>
                {cards === undefined ? (
                  <div
                    aria-busy="true"
                    style={{ height: 64, borderRadius: 16, background: 'var(--toli-panel)' }}
                  />
                ) : cards.length === 0 ? (
                  <Panel dashed>
                    You have no cards yet. <Link href="/cards/add">Add your cards</Link> first.
                  </Panel>
                ) : (
                  cards.map((c) => {
                    const cat = getCatalogCard(c.cardId);
                    const name = cat?.name ?? c.cardId;
                    return (
                      <CardRow
                        key={c.id}
                        name={name}
                        issuer={cat?.issuer ?? ''}
                        tint={cat?.color ?? '#3D3D3A'}
                        sub={cat?.bank}
                        selected={ticked?.has(c.id) ?? false}
                        onToggle={() => toggle(c.id)}
                        toggleLabels={{ on: `Don’t share ${name}`, off: `Share ${name}` }}
                      />
                    );
                  })
                )}
                <Notice>
                  {first} sees card names only. They can’t see limits, spends or anything you
                  haven’t ticked.
                </Notice>
              </section>
            ) : null}
          </>
        )}
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

      {enabled && person && cards && cards.length > 0 ? (
        <ActionBar>
          <Button full onClick={share} disabled={busy || (n === 0 && already.size === 0)}>
            {busy
              ? 'Sharing…'
              : n === 0
                ? `Stop sharing with ${first}`
                : `Share ${n} card${n === 1 ? '' : 's'} with ${first}`}
          </Button>
        </ActionBar>
      ) : null}
    </div>
  );
}
