'use client';
import { CATALOG, CATALOG_BANKS, searchCatalog } from '@toli/catalog';
import {
  ActionBar,
  Button,
  CardRow,
  Chip,
  Heading,
  IconCircle,
  Lede,
  SearchField,
  SectionLabel,
  TrayChip,
} from '@toli/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { newLocalId, useAddCard, useMyCards, useRemoveCard } from '@/lib/useMyCards';

const byId = new Map(CATALOG.map((c) => [c.id, c]));

export function AddCards() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/cards';
  const onboarding = params.get('onboarding') === '1';

  const { data: mine } = useMyCards();
  const add = useAddCard();
  const remove = useRemoveCard();
  const [query, setQuery] = useState('');
  const [bank, setBank] = useState<string | undefined>(undefined);

  const held = useMemo(() => new Map((mine ?? []).map((c) => [c.cardId as string, c])), [mine]);
  const rows = useMemo(() => searchCatalog(query, { issuer: bank }), [query, bank]);

  const toggle = (cardId: string) => {
    const existing = held.get(cardId);
    if (existing) remove.mutate(existing.id);
    else add.mutate({ cardId, id: newLocalId() });
  };

  const n = held.size;
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
      <div style={{ padding: '52px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={next} aria-label="Back" style={{ marginLeft: -12, color: 'inherit' }}>
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
          {onboarding ? (
            <span style={{ fontSize: 13, color: 'var(--toli-ink-3)' }}>Step 2 of 2</span>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Heading size="title">Which cards do you carry?</Heading>
          <Lede>
            Start with your bank, then tap the card. The name is printed on the front of the card —
            we never ask for the number.
          </Lede>
        </div>
        <SearchField
          id="search"
          label="Search cards"
          placeholder="Search by bank or card name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div
          role="group"
          aria-label="Banks"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            marginRight: -24,
            paddingRight: 24,
            scrollbarWidth: 'none',
          }}
        >
          <Chip selected={bank === undefined} onClick={() => setBank(undefined)}>
            All banks
          </Chip>
          {CATALOG_BANKS.map((b) => (
            <Chip key={b} selected={bank === b} onClick={() => setBank(bank === b ? undefined : b)}>
              {b}
            </Chip>
          ))}
        </div>
      </div>

      <div
        style={{
          flexGrow: 1,
          padding: '20px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel count={n}>Your cards</SectionLabel>
          {n === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--toli-ink-4)', padding: '6px 0' }}>
              Nothing added yet — tap a card below.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[...held.values()].map((c) => {
                const cat = byId.get(c.cardId);
                return (
                  <TrayChip
                    key={c.id}
                    name={cat?.name ?? c.cardId}
                    tint={cat?.color ?? '#3D3D3A'}
                    onRemove={() => remove.mutate(c.id)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel>{bank ? `${bank} cards` : query ? 'Matches' : 'All cards'}</SectionLabel>
          {rows.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--toli-ink-4)', padding: '6px 0' }}>
              No card matches “{query}”. Try the bank name.
            </div>
          ) : (
            rows.map((c) => (
              <CardRow
                key={c.id}
                name={c.name}
                issuer={c.issuer}
                tint={c.color}
                sub={`${c.bank} · ${c.perks[0] ?? ''}`}
                selected={held.has(c.id)}
                onToggle={() => toggle(c.id)}
              />
            ))
          )}
        </section>
      </div>

      <ActionBar>
        <Button full onClick={() => router.replace(next)}>
          {n === 0 ? 'Skip for now' : `Done · ${n} card${n === 1 ? '' : 's'}`}
        </Button>
      </ActionBar>
    </div>
  );
}
