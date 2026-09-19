'use client';
import { Invite } from '@toli/domain';
import { Button, GroupTile, Heading, Lede, Panel, SectionLabel, TextField } from '@toli/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAudience, useMyGroups } from '@/lib/useGroups';

/** Accepts a whole invite link or just the code. */
const codeFrom = (raw: string): string => {
  const tail =
    raw
      .trim()
      .split(/[/?#\s]/)
      .filter(Boolean)
      .pop() ?? '';
  return Invite.parseCode(tail);
};

function GroupLink({ id, name }: { id: string; name: string }) {
  const { data: audience } = useAudience(id);
  const summary = audience
    ? `${audience.memberCount} member${audience.memberCount === 1 ? '' : 's'} · ${audience.cardCount} card${audience.cardCount === 1 ? '' : 's'}`
    : ' ';
  return (
    <Link href={`/groups/${id}`} style={{ textDecoration: 'none' }}>
      <GroupTile name={name} summary={summary} />
    </Link>
  );
}

export function Groups() {
  const router = useRouter();
  const { data: memberships } = useMyGroups();
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | undefined>();

  const groups = (memberships ?? []).filter((m) => m.type === 'group');

  const openInvite = (e: FormEvent) => {
    e.preventDefault();
    try {
      router.push(`/join/${codeFrom(pasted)}`);
    } catch {
      setError(
        'That does not look like a Toli invite. Paste the whole link or the 8-character code.',
      );
    }
  };

  const paste = (
    <form onSubmit={openInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TextField
        id="invite"
        label="Paste an invite link"
        placeholder="toli.app/join/ABCD2345"
        autoCapitalize="characters"
        autoCorrect="off"
        value={pasted}
        onChange={(e) => {
          setPasted(e.target.value);
          setError(undefined);
        }}
        error={error}
      />
      <Button
        type="submit"
        variant={groups.length === 0 ? 'primary' : 'secondary'}
        full
        disabled={pasted.trim().length === 0}
      >
        Open invite
      </Button>
    </form>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Heading size="title">Groups</Heading>
        <Lede>The people you split bills with, and the cards they carry.</Lede>
      </div>

      {memberships === undefined ? (
        <div
          aria-busy="true"
          style={{ height: 72, borderRadius: 16, background: 'var(--toli-panel)' }}
        />
      ) : groups.length === 0 ? (
        <>
          <Panel dashed>
            No groups yet. A friend’s invite link gets you in, or start one and send the link on
            WhatsApp.
          </Panel>
          {paste}
          <Link href="/groups/new" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" full tabIndex={-1}>
              Start a group
            </Button>
          </Link>
        </>
      ) : (
        <>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel
              action={
                <Link href="/groups/new" style={{ fontSize: 13, fontWeight: 600 }}>
                  New group
                </Link>
              }
            >
              Your groups
            </SectionLabel>
            {groups.map((g) => (
              <GroupLink key={g.audienceId} id={g.audienceId} name={g.name ?? 'Group'} />
            ))}
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionLabel>Got an invite?</SectionLabel>
            {paste}
          </section>
        </>
      )}
    </div>
  );
}
