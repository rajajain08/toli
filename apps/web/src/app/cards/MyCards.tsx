'use client';
import { getCatalogCard } from '@toli/catalog';
import {
  Button,
  CardTile,
  Heading,
  IconCircle,
  Lede,
  PageDots,
  Panel,
  PerkChip,
  SectionLabel,
  Toggle,
  ToggleRow,
} from '@toli/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMyGroups, useSetVisibility } from '@/lib/useGroups';
import { useMyCards, useRemoveCard } from '@/lib/useMyCards';

const CARD_W = 290;
const GAP = 12;

export function MyCards() {
  const { data: cards } = useMyCards();
  const remove = useRemoveCard();
  const { data: memberships } = useMyGroups();
  const setVisibility = useSetVisibility();
  const groups = (memberships ?? []).filter((g) => g.type === 'group');
  const [selected, setSelected] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const count = cards?.length ?? 0;
  useEffect(() => {
    if (selected > Math.max(0, count - 1)) setSelected(Math.max(0, count - 1));
    setConfirming(false);
  }, [count, selected]);

  const current = cards?.[selected];
  const info = current ? getCatalogCard(current.cardId) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          padding: '56px 24px 0',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Heading size="title">My cards</Heading>
          <Lede>
            {cards === undefined ? 'Loading…' : `${count} card${count === 1 ? '' : 's'}`} ·{' '}
            <Link href="/privacy" style={{ fontWeight: 600 }}>
              what friends see
            </Link>
          </Lede>
        </div>
        <Link href="/cards/add" aria-label="Add a card" style={{ textDecoration: 'none' }}>
          <IconCircle filled>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </IconCircle>
        </Link>
      </div>

      {cards === undefined ? (
        <div
          aria-busy="true"
          style={{
            margin: '0 24px',
            height: 182,
            borderRadius: 18,
            background: 'var(--toli-panel)',
          }}
        />
      ) : count === 0 ? (
        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel dashed>
            No cards yet. Add the ones you carry, by name only. We never ask for the number.
          </Panel>
          <Link href="/cards/add" style={{ textDecoration: 'none' }}>
            <Button full tabIndex={-1}>
              Add your cards
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ overflow: 'hidden', padding: '8px 24px 18px' }}>
              <div
                role="group"
                aria-label="Your cards"
                style={{
                  display: 'flex',
                  gap: GAP,
                  transform: `translateX(-${selected * (CARD_W + GAP)}px)`,
                  transition: 'transform 250ms ease',
                }}
              >
                {cards.map((c, i) => {
                  const cat = getCatalogCard(c.cardId);
                  return (
                    <CardTile
                      key={c.id}
                      variant="wallet"
                      name={cat?.name ?? c.cardId}
                      issuer={cat?.issuer ?? ''}
                      tint={cat?.color ?? '#3D3D3A'}
                      selected={i === selected}
                      onClick={() => setSelected(i)}
                      footer={
                        c.visibleTo.size === 0
                          ? 'Private — only you'
                          : `Visible to ${c.visibleTo.size}`
                      }
                    />
                  );
                })}
              </div>
            </div>
            <PageDots
              count={count}
              active={selected}
              onSelect={setSelected}
              labelFor={(i) => `Show ${getCatalogCard(cards[i]!.cardId)?.name ?? 'card'}`}
            />
          </div>

          {current ? (
            <div
              style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Perks we know about</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(info?.perks ?? []).map((p) => (
                    <PerkChip key={p}>{p}</PerkChip>
                  ))}
                </div>
              </section>

              <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Who can see this card</SectionLabel>
                {groups.length === 0 ? (
                  <Panel>
                    Only you, for now. Join or create a group and you can switch this card on for
                    it.
                  </Panel>
                ) : (
                  <Panel>
                    {groups.map((g, i) => {
                      const on = current.isVisibleTo(g.audienceId);
                      const name = g.name ?? 'Group';
                      return (
                        <ToggleRow key={g.audienceId} label={name} last={i === groups.length - 1}>
                          <Toggle
                            on={on}
                            label={`${on ? 'Visible to' : 'Hidden from'} ${name}`}
                            onChange={(visible) =>
                              setVisibility.mutate({
                                cardId: current.id,
                                audienceId: g.audienceId,
                                visible,
                              })
                            }
                          />
                        </ToggleRow>
                      );
                    })}
                  </Panel>
                )}
              </section>

              <div>
                {confirming ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="small" onClick={() => setConfirming(false)}>
                      Keep it
                    </Button>
                    <Button size="small" onClick={() => remove.mutate(current.id)}>
                      Remove {info?.name ?? 'card'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="small" onClick={() => setConfirming(true)}>
                    Remove this card
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
