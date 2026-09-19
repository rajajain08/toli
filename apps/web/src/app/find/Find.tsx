'use client';
import type { CardHolder, HeldCard } from '@toli/application';
import { CATALOG, searchCatalog, type CatalogCardJson } from '@toli/catalog';
import { CardId, UserId } from '@toli/domain';
import {
  Avatar,
  Button,
  CardRow,
  CardTile,
  Chip,
  Heading,
  Lede,
  Panel,
  SearchField,
  SectionLabel,
} from '@toli/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { track } from '@/lib/analytics';
import { getContainer } from '@/lib/container';
import { useUid } from '@/lib/useGroups';

type Segment = 'everyone' | 'groups' | 'people';
const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'groups', label: 'Groups' },
  { id: 'people', label: 'People' },
];
const PERKS: { tag: string; label: string }[] = [
  { tag: 'lounge', label: 'Lounge access' },
  { tag: 'dining', label: 'Dining' },
  { tag: 'fuel', label: 'Fuel' },
  { tag: 'movies', label: 'Movies' },
  { tag: 'online', label: 'Online shopping' },
  { tag: 'travel', label: 'Travel' },
  { tag: 'cashback', label: 'Cashback' },
];
const byId = new Map(CATALOG.map((c) => [c.id, c]));
const label = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ');

const inSegment = (h: CardHolder, seg: Segment) =>
  seg === 'everyone' ||
  h.via.some((v) => (seg === 'groups' ? v.type === 'group' : v.type === 'direct'));

const viaLine = (h: CardHolder) => {
  const groups = h.via.filter((v) => v.type === 'group').map((v) => v.name ?? 'a group');
  const direct = h.via.some((v) => v.type === 'direct');
  return [...groups, ...(direct ? ['Shares with you directly'] : [])].join(' · ');
};

/** No phone numbers are ever exposed, so "Ask" hands a ready message to the phone's share sheet. */
async function ask(
  holder: CardHolder,
  cardName: string,
): Promise<'shared' | 'copied' | 'cancelled'> {
  const text = `Hey ${holder.ownerName.split(' ')[0]}, could we put this one on your ${cardName}? I’ll settle up right away.`;
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}

export function Find() {
  const uid = useUid();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<CatalogCardJson | undefined>();
  const [perk, setPerk] = useState<string | undefined>();
  const [segment, setSegment] = useState<Segment>('everyone');
  const [note, setNote] = useState<string | undefined>();

  const matches = useMemo(
    () => (query.trim().length < 2 || picked ? [] : searchCatalog(query).slice(0, 8)),
    [query, picked],
  );

  const holders = useQuery<CardHolder[]>({
    queryKey: ['find', uid ?? '-', picked?.id ?? '-'],
    enabled: uid !== undefined && picked !== undefined,
    staleTime: 0,
    queryFn: async () => {
      const c = await getContainer();
      const res = await c.findCardHolders.execute({
        actor: UserId(uid!),
        cardId: CardId(picked!.id),
      });
      void track('find_used', { by: 'card', found: res.length });
      return res;
    },
  });

  const byPerk = useQuery<HeldCard[]>({
    queryKey: ['find-perk', uid ?? '-', perk ?? '-'],
    enabled: uid !== undefined && perk !== undefined && picked === undefined,
    staleTime: 0,
    queryFn: async () => {
      const c = await getContainer();
      const res = await c.findCardHolders.byTag({ actor: UserId(uid!), tag: perk! });
      void track('find_used', { by: 'perk', found: res.length });
      return res;
    },
  });

  const choose = (card: CatalogCardJson) => {
    setPicked(card);
    setQuery(card.name);
    setSegment('everyone');
    setNote(undefined);
  };
  const clear = () => {
    setPicked(undefined);
    setQuery('');
    setNote(undefined);
  };

  const shown = (holders.data ?? []).filter((h) => inSegment(h, segment));
  const total = holders.data?.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Heading size="title">Who has this card?</Heading>
        <Lede>Searches your groups and people who share with you.</Lede>
      </div>

      <SearchField
        id="find"
        label="Search for a card"
        placeholder="Search for a card"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (picked) setPicked(undefined);
          setPerk(undefined);
        }}
      />

      {matches.length > 0 ? (
        <div
          role="listbox"
          aria-label="Matching cards"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={false}
              aria-label={`${c.issuer} ${c.name}`}
              onClick={() => choose(c)}
              style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left' }}
            >
              <CardRow name={c.name} issuer={c.issuer} tint={c.color} sub={c.bank} />
            </button>
          ))}
        </div>
      ) : null}
      {query.trim().length >= 2 && !picked && matches.length === 0 ? (
        <Panel dashed>No card matches “{query}”. Try the bank name.</Panel>
      ) : null}

      {picked ? (
        <>
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CardTile name={picked.name} issuer={picked.issuer} tint={picked.color} />
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--toli-ink)' }}>
                  {picked.name}
                </div>
                <div style={{ fontSize: 13 }}>
                  {[picked.bank, ...picked.tags.slice(0, 2).map(label)].join(' · ')}
                </div>
              </div>
              <Button variant="tonal" size="small" onClick={clear}>
                Clear
              </Button>
            </div>
          </Panel>

          <div role="group" aria-label="Where to look" style={{ display: 'flex', gap: 8 }}>
            {SEGMENTS.map((s) => (
              <Chip key={s.id} selected={segment === s.id} onClick={() => setSegment(s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>

          <section
            aria-label="People who have it"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {holders.isPending ? (
              <div
                aria-busy="true"
                style={{ height: 64, borderRadius: 16, background: 'var(--toli-panel)' }}
              />
            ) : (
              <>
                <SectionLabel>
                  {total === 0
                    ? 'Nobody you know has it'
                    : `${total} ${total === 1 ? 'person' : 'people'} you know ${total === 1 ? 'has' : 'have'} it`}
                </SectionLabel>
                {total === 0 ? (
                  <Panel dashed>
                    Nobody in your groups has shared this card. It may be held but kept private.
                  </Panel>
                ) : shown.length === 0 ? (
                  <div style={{ fontSize: 14, color: 'var(--toli-ink-4)' }}>
                    None in {segment === 'groups' ? 'your groups' : 'your 1:1 shares'}.
                  </div>
                ) : (
                  shown.map((h) => (
                    <Panel key={h.ownerId}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar person={{ id: h.ownerId, name: h.ownerName }} size={40} />
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--toli-ink)' }}>
                            {h.ownerName}
                          </div>
                          <div style={{ fontSize: 13 }}>{viaLine(h)}</div>
                        </div>
                        <Button
                          variant="secondary"
                          size="small"
                          aria-label={`Ask ${h.ownerName}`}
                          onClick={async () => {
                            const res = await ask(h, picked.name);
                            setNote(
                              res === 'copied'
                                ? 'Message copied. Paste it in your chat.'
                                : undefined,
                            );
                          }}
                        >
                          Ask
                        </Button>
                      </div>
                    </Panel>
                  ))
                )}
              </>
            )}
            <div
              role="status"
              style={{
                minHeight: 18,
                fontSize: 13,
                lineHeight: '18px',
                color: 'var(--toli-ink-3)',
              }}
            >
              {note}
            </div>
          </section>
        </>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionLabel>Or find by perk</SectionLabel>
          <div
            role="group"
            aria-label="Perks"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
          >
            {PERKS.map((p) => (
              <Chip
                key={p.tag}
                selected={perk === p.tag}
                onClick={() => setPerk(perk === p.tag ? undefined : p.tag)}
              >
                {p.label}
              </Chip>
            ))}
          </div>
          {perk ? (
            byPerk.isPending ? (
              <div
                aria-busy="true"
                style={{ height: 64, borderRadius: 16, background: 'var(--toli-panel)' }}
              />
            ) : (byPerk.data ?? []).length === 0 ? (
              <Panel dashed>Nobody you know has shared a card with that perk yet.</Panel>
            ) : (
              <div
                role="list"
                aria-label="Cards with this perk"
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {(byPerk.data ?? []).map((c) => {
                  const cat = byId.get(c.cardId);
                  const names = c.holders.map((h) => h.ownerName.split(' ')[0]).join(', ');
                  return (
                    <button
                      key={c.cardId}
                      type="button"
                      role="listitem"
                      aria-label={`${c.name}, held by ${names}`}
                      onClick={() => cat && choose(cat)}
                      style={{
                        border: 0,
                        background: 'transparent',
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      <CardRow
                        name={c.name}
                        issuer={c.issuer}
                        tint={c.color}
                        sub={`${names} ${c.holders.length === 1 ? 'has' : 'have'} it`}
                      />
                    </button>
                  );
                })}
              </div>
            )
          ) : null}
        </section>
      )}
    </div>
  );
}
