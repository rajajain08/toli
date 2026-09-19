'use client';
import {
  AvatarRow,
  Button,
  CardRow,
  Chip,
  Heading,
  IconCircle,
  Lede,
  Panel,
  PersonHeader,
} from '@toli/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { track } from '@/lib/analytics';
import { callableMessage, callCreateInvite } from '@/lib/api';
import { useAudience, useAudienceCards, useAudienceMembers, useUid } from '@/lib/useGroups';

const label = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1).replace(/-/g, ' ');

export function Group({ id }: { id: string }) {
  const uid = useUid();
  const params = useSearchParams();
  const { data: audience } = useAudience(id);
  const { data: members } = useAudienceMembers(id);
  const { data: cards } = useAudienceCards(id);

  const [person, setPerson] = useState('all');
  const [tag, setTag] = useState<string | undefined>();
  const [inviteCode, setInviteCode] = useState<string | undefined>(
    params.get('invite') ?? undefined,
  );
  const [shareNote, setShareNote] = useState<string | undefined>();

  useEffect(() => {
    if (audience) void track('group_joined', { members: audience.memberCount });
    // once per group view
  }, [audience?.id]);

  const tags = useMemo(
    () => [...new Set((cards ?? []).flatMap((c) => c.tags))].slice(0, 6),
    [cards],
  );
  const total = cards?.length ?? 0;

  const share = async () => {
    setShareNote(undefined);
    try {
      const code = inviteCode ?? (await callCreateInvite({ audienceId: id })).code;
      setInviteCode(code);
      const url = `${window.location.origin}/join/${code}`;
      const text = `Join ${audience?.name ?? 'our group'} on Toli so we know whose card to use.`;
      if (navigator.share) await navigator.share({ title: 'Toli', text, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareNote('Invite link copied. Paste it in WhatsApp.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setShareNote(callableMessage(err));
    }
  };

  if (audience === null)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Heading size="title">Group not found</Heading>
        <Lede>You may have left it, or the link is wrong.</Lede>
        <Link href="/groups">Back to groups</Link>
      </div>
    );

  const people = (members ?? []).filter((m) => person === 'all' || m.userId === person);
  const shown = (cards ?? []).filter(
    (c) => (person === 'all' || c.ownerId === person) && (!tag || c.tags.includes(tag)),
  );
  const mineHere = (cards ?? []).filter((c) => c.ownerId === uid).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/groups"
          aria-label="Back to groups"
          style={{ marginLeft: -12, color: 'inherit' }}
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
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <Heading size="title">{audience?.name ?? ' '}</Heading>
          <div style={{ fontSize: 14, color: 'var(--toli-ink-3)' }}>
            {audience === undefined
              ? ' '
              : person === 'all' && !tag
                ? `${audience.memberCount} member${audience.memberCount === 1 ? '' : 's'} · ${total} card${total === 1 ? '' : 's'}`
                : `Showing ${shown.length} of ${total} cards`}
          </div>
        </div>
      </div>

      {inviteCode && params.get('invite') ? (
        <Panel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: 'var(--toli-ink)', fontWeight: 600 }}>
              Group created. Now send the link.
            </div>
            <div>
              Friends see the group’s name and how many cards are in it before they sign in.
            </div>
            <Button full onClick={share}>
              Share invite link
            </Button>
          </div>
        </Panel>
      ) : null}
      {shareNote ? (
        <div role="status" style={{ fontSize: 14, color: 'var(--toli-ink-3)' }}>
          {shareNote}
        </div>
      ) : null}

      <AvatarRow
        people={[
          { id: 'all', name: 'Everyone' },
          ...(members ?? []).map((m) => ({
            id: m.userId,
            name: m.userId === uid ? 'You' : m.name,
            empty: !(cards ?? []).some((c) => c.ownerId === m.userId),
          })),
        ]}
        selectedId={person}
        onSelect={setPerson}
        action={{ label: 'Invite', onClick: share }}
      />

      {tags.length > 0 ? (
        <div
          role="group"
          aria-label="Categories"
          style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}
        >
          <Chip selected={!tag} onClick={() => setTag(undefined)}>
            All
          </Chip>
          {tags.map((t) => (
            <Chip key={t} selected={tag === t} onClick={() => setTag(tag === t ? undefined : t)}>
              {label(t)}
            </Chip>
          ))}
        </div>
      ) : null}

      {cards !== undefined && mineHere === 0 ? (
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flexGrow: 1 }}>You’re not sharing any cards here yet.</div>
            <Link href="/cards" style={{ textDecoration: 'none' }}>
              <Button size="small" tabIndex={-1}>
                Choose cards
              </Button>
            </Link>
          </div>
        </Panel>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {people.map((m) => {
          const theirs = (cards ?? []).filter((c) => c.ownerId === m.userId);
          const visible = theirs.filter((c) => !tag || c.tags.includes(tag));
          return (
            <section
              key={m.userId}
              aria-label={m.userId === uid ? 'You' : m.name}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <PersonHeader
                id={m.userId}
                name={m.userId === uid ? 'You' : m.name}
                empty={theirs.length === 0}
                note={
                  theirs.length === 0
                    ? undefined
                    : `${theirs.length} card${theirs.length === 1 ? '' : 's'}`
                }
              />
              {theirs.length === 0 ? (
                <Panel dashed>
                  {m.userId === uid
                    ? 'Switch a card on for this group from My cards.'
                    : 'Hasn’t added any cards yet'}
                </Panel>
              ) : visible.length === 0 ? (
                <div style={{ fontSize: 14, color: 'var(--toli-ink-4)', padding: '4px 2px' }}>
                  No {tag ? label(tag).toLowerCase() : ''} cards
                </div>
              ) : (
                visible.map((c) => (
                  <CardRow
                    key={c.userCardId}
                    name={c.name}
                    issuer={c.issuer}
                    tint={c.color}
                    tags={c.tags.slice(0, 3).map(label)}
                  />
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
